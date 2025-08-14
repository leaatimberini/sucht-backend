import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class FeedbackDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['like', 'dislike'])
  feedback: 'like' | 'dislike';
}