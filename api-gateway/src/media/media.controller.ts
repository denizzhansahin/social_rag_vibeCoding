import { Controller, Post, Get, Body, Param, Res, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Controller('media')
export class MediaController {
  private readonly uploadDir = path.join(process.cwd(), 'uploads');

  constructor() {
    // Klasör yoksa oluştur
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  @Post('upload')
  async uploadMedia(
    @Body('base64') base64: string,
    @Body('mimeType') mimeType: string // orn: 'image/jpeg'
  ) {
    if (!base64 || !mimeType) {
      throw new HttpException('base64 ve mimeType alanları zorunludur', HttpStatus.BAD_REQUEST);
    }

    try {
      const extMatch = mimeType.match(/\/(.*?)$/);
      const ext = extMatch ? extMatch[1] : 'img';
      const fileName = `${uuidv4()}.${ext}`;
      const filePath = path.join(this.uploadDir, fileName);

      // Sadece base64 datasını çıkar (data:image/jpeg;base64,... kullanılmışsa başı buda)
      const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      // Admin Panel max limitleri buradan da kontrol edilebilir, 
      // Ancak boyutu zaten frontend'de compress ediyoruz.
      if (buffer.length > 5 * 1024 * 1024) { // Absolute fallback max 5MB (Bknz: Implementation Plan)
         throw new HttpException('Dosya bedeni backend maks sınırını (5MB) aşıyor', HttpStatus.PAYLOAD_TOO_LARGE);
      }

      fs.writeFileSync(filePath, buffer);

      return {
        url: `/api/media/${fileName}`,
        fileName: fileName,
        size: buffer.length
      };
    } catch (err) {
      console.error('[MediaController] Upload error:', err);
      throw new HttpException('Dosya kaydedilemedi', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':fileName')
  async getMedia(@Param('fileName') fileName: string, @Res() res: Response) {
    const filePath = path.join(this.uploadDir, fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(HttpStatus.NOT_FOUND).send('Resim bulunamadı.');
    }

    return res.sendFile(filePath);
  }
}
