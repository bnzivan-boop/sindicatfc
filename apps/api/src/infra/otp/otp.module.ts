import { Global, Module } from '@nestjs/common';
import { ConsoleOtpChannel } from './console.channel.js';
import { OtpDeliveryService } from './otp-delivery.service.js';
import { SmsOtpChannel } from './sms.channel.js';
import { TelegramOtpChannel } from './telegram.channel.js';
import { VkOtpChannel } from './vk.channel.js';

@Global()
@Module({ providers: [TelegramOtpChannel, VkOtpChannel, SmsOtpChannel, ConsoleOtpChannel, OtpDeliveryService], exports: [OtpDeliveryService] })
export class OtpModule {}
