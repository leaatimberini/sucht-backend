import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Product } from './product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductPurchase } from './product-purchase.entity';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { User } from 'src/users/user.entity';
import { UsersService } from 'src/users/users.service';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { PointTransactionsService } from 'src/point-transactions/point-transactions.service';
import { PointTransactionReason } from 'src/point-transactions/point-transaction.entity';

// Se define el tipo del item de preferencia localmente para evitar problemas de importación del SDK.
interface PreferenceItem {
  id: string;
  title: string;
  quantity: number;
  unit_price: number;
  currency_id: string;
}

@Injectable()
export class StoreService {
  private readonly logger = new Logger(StoreService.name);

  constructor(
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
    @InjectRepository(ProductPurchase)
    private purchasesRepository: Repository<ProductPurchase>,
    private usersService: UsersService,
    private configService: ConfigService,
    private pointTransactionsService: PointTransactionsService,
  ) {}

  // --- Gestión de Productos (Admin) ---

  async createProduct(createProductDto: CreateProductDto): Promise<Product> {
    const newProduct = this.productsRepository.create(createProductDto);
    return this.productsRepository.save(newProduct);
  }

  async updateProduct(id: string, updateProductDto: UpdateProductDto): Promise<Product> {
    const product = await this.findOneProduct(id);
    this.productsRepository.merge(product, updateProductDto);
    return this.productsRepository.save(product);
  }

  async removeProduct(id: string): Promise<void> {
    const result = await this.productsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }
  }

  // --- Lógica para Clientes ---

  async findAllProducts(): Promise<Product[]> {
    return this.productsRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findOneProduct(id: string): Promise<Product> {
    const product = await this.productsRepository.findOneBy({ id });
    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }
    return product;
  }
  
  // --- NUEVO: Obtener productos comprados por el usuario ---
  async findProductsByUserId(userId: string): Promise<ProductPurchase[]> {
    const purchases = await this.purchasesRepository.find({
      where: { userId },
      relations: ['product', 'event'],
      order: { createdAt: 'DESC' },
    });
    return purchases;
  }

  // --- Lógica de Compra con Carrito ---

  async createPurchasePreference(dto: CreatePurchaseDto, buyer: User) {
    this.logger.log(`[createPurchasePreference] Usuario ${buyer.email} quiere comprar ${dto.items.length} tipo(s) de producto(s)`);
    const { items, eventId } = dto;

    const productIds = items.map(item => item.productId);
    const productsInDb = await this.productsRepository.findBy({ id: In(productIds) });

    if (productIds.length !== productsInDb.length) {
      throw new NotFoundException('Uno o más productos no fueron encontrados.');
    }

    let totalAmount = 0;
    const preferenceItems: PreferenceItem[] = [];

    for (const item of items) {
      const product = productsInDb.find(p => p.id === item.productId);
      if (!product) continue;
      if (product.stock !== null && product.stock < item.quantity) {
        throw new BadRequestException(`No hay suficiente stock para ${product.name}.`);
      }
      // ===== CORRECCIÓN CLAVE: Se convierte el precio a número =====
      const priceAsNumber = Number(product.price);
      totalAmount += priceAsNumber * item.quantity;
      preferenceItems.push({
        id: product.id,
        title: product.name,
        quantity: item.quantity,
        unit_price: priceAsNumber, // Se usa el precio convertido a número
        currency_id: 'ARS',
      });
    }

    const owner = await this.usersService.findOwner();
    if (!owner || !owner.mpAccessToken) {
      throw new InternalServerErrorException("La cuenta del dueño no tiene un Access Token de MP configurado.");
    }

    const mpClient = new MercadoPagoConfig({ accessToken: owner.mpAccessToken });
    const preferenceClient = new Preference(mpClient);

    const preference = await preferenceClient.create({
      body: {
        items: preferenceItems,
        back_urls: {
          success: `${this.configService.get('FRONTEND_URL')}/payment/success`,
          failure: `${this.configService.get('FRONTEND_URL')}/payment/failure`,
        },
        notification_url: `${this.configService.get('BACKEND_URL')}/payments/webhook`,
        auto_return: 'approved',
        external_reference: JSON.stringify({
          type: 'PRODUCT_PURCHASE',
          buyerId: buyer.id,
          eventId,
          items,
          amountPaid: totalAmount,
        }),
      },
    });

    this.logger.log(`[createPurchasePreference] Preferencia creada con ID: ${preference.id}`);
    return { preferenceId: preference.id };
  }

  async finalizePurchase(data: any): Promise<ProductPurchase[]> {
    const { buyerId, eventId, items, amountPaid, paymentId } = data;
    this.logger.log(`[finalizePurchase] Finalizando compra de ${items.length} productos para usuario ${buyerId}`);

    const purchases: ProductPurchase[] = [];
    for (const item of items) {
      const purchase = this.purchasesRepository.create({
        userId: buyerId,
        productId: item.productId,
        eventId,
        quantity: item.quantity,
        amountPaid: amountPaid,
        paymentId,
      });
      purchases.push(await this.purchasesRepository.save(purchase));
    }
    
    try {
      const buyer = await this.usersService.findOneById(buyerId);
      const pointsConfig = await this.configService.get('points_store_purchase');
      const pointsToAward = pointsConfig ? parseInt(pointsConfig, 10) : 50;

      if (buyer && pointsToAward > 0) {
        await this.pointTransactionsService.createTransaction(
          buyer, pointsToAward, PointTransactionReason.STORE_PURCHASE,
          `Compra en la tienda por un total de $${amountPaid}`, paymentId
        );
      }
    } catch (error) {
      this.logger.error(`[finalizePurchase] No se pudieron otorgar puntos por la compra con paymentId ${paymentId}`, error);
    }

    return purchases;
  }
}