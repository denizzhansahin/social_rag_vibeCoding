Kesinlikle, bu çok daha modern ve esnek bir yaklaşım. Prisma/REST yerine **TypeORM ve GraphQL** kullanmak, özellikle karmaşık veri ilişkileri ve esnek istemci sorguları için harika bir seçimdir. İsteğini anladım ve mimariyi bu doğrultuda baştan, detaylı ve doğru bir şekilde yapılandırıyorum.

GraphQL'in "code-first" (önce kod) yaklaşımını kullanarak, TypeScript sınıflarımızdan ve dekoratörlerimizden GraphQL şemasını otomatik olarak oluşturacağız. Bu, hem tip güvenliği sağlar hem de geliştirmeyi hızlandırır.

İşte NestJS tarafının **TypeORM ve GraphQL** ile yeniden inşası:

---

### FAZ 1: Kurulum ve Gerekli Paketler

1.  **NestJS Projeniz (`api-gateway`) İçinde Gerekli Paketleri Kurun:**
    ```bash
    cd api-gateway

    # GraphQL için temel paketler
    npm install @nestjs/graphql @nestjs/apollo apollo-server-express graphql

    # TypeORM için temel paketler
    npm install @nestjs/typeorm typeorm pg

    # Önceki kurulumdan kalanlar (zaten kuruluysa atlayabilirsiniz)
    npm install @nestjs/config class-validator class-transformer ioredis
    ```

### FAZ 2: Ana Modül Yapılandırması (`app.module.ts`)

Bu dosya, NestJS'in TypeORM ile veritabanına ve GraphQL ile dış dünyaya nasıl bağlanacağını belirler.

**`src/app.module.ts` dosyasını aşağıdaki gibi güncelleyin:**
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { EvaluationsModule } from './evaluations/evaluations.module';
import { RedisModule } from './common/redis/redis.module';
// Redis ve Evaluations modüllerini daha önce oluşturmuştuk.

@Module({
  imports: [
    // 1. .env dosyasını global olarak yükle
    ConfigModule.forRoot({ isGlobal: true }),

    // 2. GraphQL Modülünü Yapılandır (Code-First)
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'), // Şemayı otomatik oluştur
      sortSchema: true,
      playground: true, // Test için harika bir arayüz sağlar
    }),

    // 3. TypeORM ile PostgreSQL Bağlantısını Yapılandır
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('PG_HOST', 'localhost'),
        port: configService.get<int>('PG_PORT', 5432),
        username: configService.get<string>('PG_USER'),
        password: configService.get<string>('PG_PASSWORD'),
        database: configService.get<string>('PG_DB'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'], // Entity'leri otomatik bul
        synchronize: true, // DİKKAT: Geliştirme için true, production'da false olmalı!
      }),
    }),
    
    // 4. Kendi modüllerimizi import et
    EvaluationsModule,
    RedisModule,
  ],
})
export class AppModule {}
```
*Not: Proje kök dizinindeki `.env` dosyanızda PostgreSQL ve Redis bilgilerinin olduğundan emin olun.*

### FAZ 3: TypeORM Entity ve GraphQL Tiplerini Oluşturma

Prisma şeması yerine, artık TypeScript sınıfları ve dekoratörler kullanacağız.

1.  **TypeScript Enum'ını Oluşturma:** `src/evaluations/` klasöründe `enums/evaluation-category.enum.ts` dosyası oluşturun:
    ```typescript
    export enum EvaluationCategory {
      technical_skills = 'technical_skills',
      team_dynamics = 'team_dynamics',
      behavioral = 'behavioral',
      milestone = 'milestone',
    }
    ```

2.  **TypeORM Entity'sini Oluşturma (`evaluation.entity.ts`):** Bu dosya, veritabanı tablosunu ve GraphQL nesne tipini (`ObjectType`) aynı anda tanımlar.
    ```typescript
    // src/evaluations/entities/evaluation.entity.ts
    import { ObjectType, Field, ID, Int, registerEnumType } from '@nestjs/graphql';
    import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
    import { EvaluationCategory } from '../enums/evaluation-category.enum';

    // GraphQL şeması için Enum'ı kaydet
    registerEnumType(EvaluationCategory, {
      name: 'EvaluationCategory',
    });

    @ObjectType() // GraphQL için bu bir nesne tipidir
    @Entity('evaluations') // TypeORM için bu bir veritabanı tablosudur
    export class Evaluation {
      @Field(() => ID) // GraphQL Tipi: ID
      @PrimaryGeneratedColumn('uuid') // Veritabanı Tipi: uuid
      id: string;

      @Field()
      @Column()
      evaluatorId: string;

      @Field()
      @Column()
      targetId: string;

      @Field(() => EvaluationCategory)
      @Column({ type: 'enum', enum: EvaluationCategory })
      category: EvaluationCategory;

      @Field({ nullable: true })
      @Column({ nullable: true })
      rawMentorNote?: string;
      
      @Field(() => Int, { nullable: true })
      @Column({ nullable: true })
      score1to5?: number;

      // JSONB alanını GraphQL için string olarak gösteriyoruz, 
      // çünkü GraphQL'in yerleşik bir JSON tipi yoktur.
      // İsterseniz custom scalar type oluşturulabilir.
      @Field(() => String, { nullable: true }) 
      @Column({ type: 'jsonb', nullable: true })
      aiExtractedInsights?: object;

      @Field()
      @CreateDateColumn()
      createdAt: Date;
    }
    ```

3.  **GraphQL Input Tipini Oluşturma (DTO):** Bu, `mutation` yaparken göndereceğimiz verinin şemasıdır.
    ```typescript
    // src/evaluations/dto/create-evaluation.input.ts
    import { InputType, Field } from '@nestjs/graphql';
    import { IsNotEmpty, IsOptional, IsString, IsUUID, IsEnum } from 'class-validator';
    import { EvaluationCategory } from '../enums/evaluation-category.enum';

    @InputType()
    export class CreateEvaluationInput {
      @Field()
      @IsUUID()
      @IsNotEmpty()
      evaluatorId: string;

      @Field()
      @IsUUID()
      @IsNotEmpty()
      targetId: string;

      @Field(() => EvaluationCategory)
      @IsEnum(EvaluationCategory)
      @IsNotEmpty()
      category: EvaluationCategory;

      @Field({ nullable: true })
      @IsString()
      @IsOptional()
      rawMentorNote?: string;
    }
    ```

### FAZ 4: Resolver ve Servis Mantığını Güncelleme

Artık Controller yerine **Resolver** kullanacağız. Servis ise TypeORM'in **Repository** pattern'ini kullanacak.

1.  **`evaluations.service.ts`'i Güncelleme:**
    ```typescript
    // src/evaluations/evaluations.service.ts
    import { Injectable } from '@nestjs/common';
    import { InjectRepository } from '@nestjs/typeorm';
    import { Repository } from 'typeorm';
    import { RedisService } from '../common/redis/redis.service';
    import { CreateEvaluationInput } from './dto/create-evaluation.input';
    import { Evaluation } from './entities/evaluation.entity';

    @Injectable()
    export class EvaluationsService {
      constructor(
        @InjectRepository(Evaluation)
        private readonly evaluationRepository: Repository<Evaluation>,
        private readonly redisService: RedisService,
      ) {}

      async create(createEvaluationInput: CreateEvaluationInput): Promise<Evaluation> {
        // 1. Gelen veriyi kullanarak yeni bir entity oluştur ve Postgres'e kaydet
        const newEvaluation = this.evaluationRepository.create(createEvaluationInput);
        await this.evaluationRepository.save(newEvaluation);

        console.log('✅ Değerlendirme Postgres\'e kaydedildi. ID:', newEvaluation.id);

        // 2. Eğer analiz edilecek bir not varsa, AI worker'ı tetikle
        if (newEvaluation.rawMentorNote) {
          await this.redisService.pushTaskToQueue('analyze_mentor_evaluation', {
            evaluation_id: newEvaluation.id,
          });
        }

        return newEvaluation;
      }
    }
    ```

2.  **Resolver Oluşturma (`evaluations.resolver.ts`):** `evaluations` klasöründe bu dosyayı oluşturun. Bu dosya Controller'ın GraphQL'deki karşılığıdır.
    ```typescript
    // src/evaluations/evaluations.resolver.ts
    import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
    import { EvaluationsService } from './evaluations.service';
    import { Evaluation } from './entities/evaluation.entity';
    import { CreateEvaluationInput } from './dto/create-evaluation.input';

    @Resolver(() => Evaluation)
    export class EvaluationsResolver {
      constructor(private readonly evaluationsService: EvaluationsService) {}

      // GraphQL 'Mutation' tanımı
      @Mutation(() => Evaluation, { name: 'createEvaluation' })
      createEvaluation(
        @Args('createEvaluationInput') createEvaluationInput: CreateEvaluationInput,
      ) {
        return this.evaluationsService.create(createEvaluationInput);
      }
    }
    ```

3.  **`evaluations.module.ts`'i Son Kez Düzenleme:**
    ```typescript
    // src/evaluations/evaluations.module.ts
    import { Module } from '@nestjs/common';
    import { TypeOrmModule } from '@nestjs/typeorm';
    import { EvaluationsService } from './evaluations.service';
    import { EvaluationsResolver } from './evaluations.resolver.ts'; // Resolver'ı ekle
    import { Evaluation } from './entities/evaluation.entity';
    import { RedisModule } from '../common/redis/redis.module';

    @Module({
      imports: [
        TypeOrmModule.forFeature([Evaluation]), // Bu modülün Evaluation entity'sini kullanacağını belirt
        RedisModule,
      ],
      providers: [EvaluationsResolver, EvaluationsService], // Controller yerine Resolver
    })
    export class EvaluationsModule {}
    ```

---

### Nasıl Test Edilir? (GraphQL Farkı)

1.  **Sistemleri Çalıştırın:** Docker, Python Worker ve NestJS API (`npm run start:dev`).
2.  **GraphQL Playground'u Açın:** Tarayıcınızda `http://localhost:3000/graphql` adresine gidin. Karşınıza interaktif bir test arayüzü çıkacak.
3.  **Mutation'ı Çalıştırın:** Arayüzün sol tarafındaki alana aşağıdaki GraphQL sorgusunu yapıştırın:
    ```graphql
    mutation CreateNewEvaluation($input: CreateEvaluationInput!) {
      createEvaluation(createEvaluationInput: $input) {
        id
        category
        rawMentorNote
        createdAt
      }
    }
    ```
4.  **Değişkenleri (Variables) Girin:** Ekranın altındaki "QUERY VARIABLES" bölümüne tıklayın ve verinizi JSON olarak girin:
    ```json
    {
      "input": {
        "evaluatorId": "11111111-1111-1111-1111-111111111111",
        "targetId": "22222222-2222-2222-2222-222222222222",
        "category": "team_dynamics",
        "rawMentorNote": "GraphQL ile gelen bu notu Python anında analiz edecek."
      }
    }
    ```
5.  **Çalıştır (Play) Butonuna Basın:**
    *   Playground'un sağ tarafında, isteğinizin sonucunu (oluşturulan kaydın `id`'si vb.) **anında** göreceksiniz.
    *   Hemen ardından, Python worker'ınızın terminalinde `🔄 Görev Başladı...` mesajı belirecek ve analiz işlemi başlayacaktır.

Bu yapı, REST API'ye göre çok daha esnek, dökümantasyonu kendiliğinden olan (self-documenting) ve tip güvenliği yüksek bir mimari sunar. Harika bir tercih