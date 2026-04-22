import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { AuthService } from './src/auth/auth.service';
import * as bcrypt from 'bcrypt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserEntity } from './src/auth/user.entity';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const userRepo = app.get(getRepositoryToken(UserEntity));

  const users = [
    { email: 'admin@vizyon.com', password: 'admin123', role: 'admin' },
    { email: 'user1@vizyon.com', password: 'user123', role: 'participant' }
  ];

  for (const u of users) {
    const user = await userRepo.findOne({ where: { email: u.email } });
    if (user) {
      console.log(`Updating password for ${u.email}...`);
      user.passwordHash = await bcrypt.hash(u.password, 10);
      await userRepo.save(user);
      console.log(`✅ Success for ${u.email}`);
    } else {
      console.log(`Creating user ${u.email}...`);
      const newUser = userRepo.create({
        email: u.email,
        passwordHash: await bcrypt.hash(u.password, 10),
        role: u.role as any,
        status: 'active' as any
      });
      await userRepo.save(newUser);
      console.log(`✅ Created ${u.email}`);
    }
  }

  await app.close();
}

bootstrap();
