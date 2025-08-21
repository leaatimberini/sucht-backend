// src/store/store.service.ts
import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, DataSource, Not, IsNull } from 'typeorm';
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
import { GiftProductDto } from './dto/gift-product.dto';
import { EventsService } from 'src/events/events.service';

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
    private dataSource: DataSource,
    private eventsService: EventsService,
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
  
  async findProductsByUserId(userId: string): Promise<ProductPurchase[]> {
    return this.purchasesRepository.find({
      where: { userId },
      relations: ['product', 'event'],
      order: { createdAt: 'DESC' },
    });
  }
  
  async findPurchaseById(purchaseId: string): Promise<ProductPurchase> {
    const purchase = await this.purchasesRepository.findOne({
        where: { id: purchaseId },
        relations: ['product', 'user', 'event'],
    });
    if(!purchase) {
        throw new NotFoundException(`Compra de producto con ID "${purchaseId}" no encontrada.`)
    }
    return purchase;
  }

  async findPurchaseByPaymentId(paymentId: string): Promise<ProductPurchase | null> {
    return this.purchasesRepository.findOne({ where: { paymentId } });
  }

  // --- Lógica de Regalos ---
  async createFreePurchase(user: User, productId: string, eventId: string, quantity: number, origin: string): Promise<ProductPurchase> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    this.logger.log(`[createFreePurchase] Creando compra gratuita para ${user.email}, producto ${productId}`);

    try {
      const product = await queryRunner.manager.findOneBy(Product, { id: productId });
      if (!product) {
        throw new NotFoundException(`Producto con ID "${productId}" no encontrado.`);
      }
      if (product.stock !== null && product.stock < quantity) {
        throw new BadRequestException(`No hay suficiente stock para ${product.name}.`);
      }

      if (product.stock !== null) {
        product.stock -= quantity;
        await queryRunner.manager.save(product);
      }

      const purchase = queryRunner.manager.create(ProductPurchase, {
        userId: user.id,
        productId,
        eventId,
        quantity,
        amountPaid: 0,
        paymentId: null,
        origin,
      });

      const savedPurchase = await queryRunner.manager.save(purchase);
      
      await queryRunner.commitTransaction();
      this.logger.log(`[createFreePurchase] Compra gratuita ${savedPurchase.id} creada exitosamente.`);
      return savedPurchase;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`[createFreePurchase] Falló la creación de la compra gratuita para ${user.email}`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async giftProductByAdmin(dto: GiftProductDto): Promise<ProductPurchase[]> {
    const { email, productId, eventId, quantity } = dto;
    this.logger.log(`Admin regalando ${quantity}x producto ${productId} a ${email} para el evento ${eventId}`);

    const user = await this.usersService.findOrCreateByEmail(email);
    const event = await this.eventsService.findOne(eventId);
    if (!event) {
        throw new NotFoundException(`Evento con ID "${eventId}" no encontrado.`);
    }

    const purchases: ProductPurchase[] = [];
    for (let i = 0; i < quantity; i++) {
        const purchase = await this.createFreePurchase(user, productId, eventId, 1, 'ADMIN_GIFT');
        purchases.push(purchase);
    }

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
      const priceAsNumber = Number(product.price);
      totalAmount += priceAsNumber * item.quantity;
      preferenceItems.push({
        id: product.id,
        title: product.name,
        quantity: item.quantity,
        unit_price: priceAsNumber,
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
    
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
        const purchases: ProductPurchase[] = [];
        for (const item of items) {
            const product = await queryRunner.manager.findOneBy(Product, { id: item.productId });
            if (!product) throw new NotFoundException(`Producto con ID "${item.productId}" no encontrado.`);
            if (product.stock !== null && product.stock < item.quantity) {
                throw new BadRequestException(`No hay stock para ${product.name}.`);
            }

            if (product.stock !== null) {
                product.stock -= item.quantity;
                await queryRunner.manager.save(product);
            }
            
            const purchase = queryRunner.manager.create(ProductPurchase, {
                userId: buyerId,
                productId: item.productId,
                eventId,
                quantity: item.quantity,
                amountPaid: amountPaid,
                paymentId,
                origin: 'PURCHASE',
            });
            purchases.push(await queryRunner.manager.save(purchase));
        }
        
        await queryRunner.commitTransaction();

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

    } catch (error) {
        await queryRunner.rollbackTransaction();
        this.logger.error(`[finalizePurchase] Falló la finalización de la compra para paymentId ${paymentId}`, error);
        throw error;
    } finally {
        await queryRunner.release();
    }
  }
    
  async validatePurchase(purchaseId: string): Promise<ProductPurchase> {
      const purchase = await this.purchasesRepository.findOne({
          where: { id: purchaseId },
          relations: ['product', 'user'],
      });

      if (!purchase) {
          throw new NotFoundException(`Compra de producto con ID "${purchaseId}" no encontrada.`);
      }

      if (purchase.redeemedAt) {
          throw new BadRequestException(`El producto ya fue canjeado por ${purchase.user.name} el ${purchase.redeemedAt.toLocaleString()}.`);
      }

      purchase.redeemedAt = new Date();
      return this.purchasesRepository.save(purchase);
  }

  async getFullPurchaseHistory(): Promise<ProductPurchase[]> {
    this.logger.log(`[getFullPurchaseHistory] Obteniendo historial completo de compras de productos.`);
    return this.purchasesRepository.find({
      relations: ['user', 'product', 'event'],
      order: { createdAt: 'DESC' },
    });
  }

  async getRedeemedPurchaseHistory(): Promise<ProductPurchase[]> {
    this.logger.log(`[getRedeemedPurchaseHistory] Obteniendo historial de productos canjeados.`);
    return this.purchasesRepository.find({
        where: {
            redeemedAt: Not(IsNull())
        },
        relations: ['user', 'product', 'event'],
        order: { redeemedAt: 'DESC' },
    });
  }
}