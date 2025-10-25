# 🚀 Scenario Studio API - Postman Collection

Bu dosya, Scenario Studio Enterprise Admin Panel API'si için hazırlanmış Postman collection'ını içerir.

## 📁 Dosyalar

- `Scenario-Studio-API.postman_collection.json` - Ana API collection'ı
- `Scenario-Studio-Environment.postman_environment.json` - Environment variables
- `POSTMAN-README.md` - Bu kılavuz

## 🛠️ Kurulum

### 1. Postman'e Import Et

1. **Postman'i aç**
2. **Import** butonuna tıkla
3. **Files** sekmesini seç
4. `Scenario-Studio-API.postman_collection.json` dosyasını seç
5. **Import** butonuna tıkla

### 2. Environment'i Import Et

1. **Import** butonuna tekrar tıkla
2. `Scenario-Studio-Environment.postman_environment.json` dosyasını seç
3. **Import** butonuna tıkla
4. Environment'i aktif hale getir (sağ üst köşede)

## 🎯 Kullanım Sırası

### 1. Backend'i Başlat
```bash
cd backend
npm run dev
```

### 2. MongoDB'yi Başlat
```bash
docker-compose up -d
```

### 3. Database'i Seed Et
```bash
cd backend
npm run seed
```

### 4. Postman'de Test Et

#### Adım 1: Login
1. **Authentication > Login** request'ini aç
2. **Send** butonuna tıkla
3. Response'da `token` değerini kopyala
4. Environment'de `token` variable'ını güncelle

#### Adım 2: Dashboard Test
1. **Admin Dashboard > Get Dashboard Stats** request'ini aç
2. **Send** butonuna tıkla
3. İstatistikleri gör

#### Adım 3: Project Oluştur
1. **Projects > Create Project** request'ini aç
2. **Send** butonuna tıkla
3. Response'da `_id` değerini kopyala
4. Environment'de `projectId` variable'ını güncelle

#### Adım 4: Scenario Oluştur
1. **Scenarios > Create Scenario** request'ini aç
2. **Send** butonuna tıkla
3. Response'da `_id` değerini kopyala
4. Environment'de `scenarioId` variable'ını güncelle

#### Adım 5: Execution Test
1. **Execution > Start Scenario Execution** request'ini aç
2. **Send** butonuna tıkla
3. Real-time execution'ı gör

## 🔧 Environment Variables

Collection otomatik olarak şu variable'ları yönetir:

- `baseUrl` - API base URL (http://localhost:3001)
- `token` - JWT authentication token
- `userId` - Current user ID
- `projectId` - Selected project ID
- `scenarioId` - Selected scenario ID
- `executionId` - Current execution ID
- `teamId` - Selected team ID
- `roleId` - Selected role ID

## 📋 Test Senaryoları

### 1. Authentication Flow
```
Login → Get Profile → Update Profile → Change Password
```

### 2. Admin Panel Flow
```
Dashboard → Projects → Teams → Users → Roles
```

### 3. Scenario Flow
```
Create Project → Create Scenario → Start Execution → Monitor Results
```

### 4. Team Management Flow
```
Create Team → Add Members → Assign Roles → Manage Projects
```

## 🚨 Troubleshooting

### Token Expired
1. **Authentication > Login** request'ini tekrar çalıştır
2. Yeni token'ı environment'e kaydet

### 401 Unauthorized
1. Token'ın doğru olduğundan emin ol
2. Backend'in çalıştığından emin ol
3. MongoDB'nin bağlı olduğundan emin ol

### 500 Internal Server Error
1. Backend loglarını kontrol et
2. MongoDB connection'ını kontrol et
3. Database seed'inin yapıldığından emin ol

## 📊 Response Examples

### Login Response
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "68fd05096b76155e61b0665e",
    "username": "admin",
    "email": "admin@example.com",
    "firstName": "Super",
    "lastName": "Admin",
    "roles": ["super-admin"],
    "teams": []
  }
}
```

### Dashboard Response
```json
{
  "stats": {
    "projectCount": 1,
    "teamCount": 1,
    "userCount": 1,
    "scenarioCount": 0
  },
  "recentProjects": [...],
  "recentScenarios": [...]
}
```

### Project Response
```json
{
  "_id": "68fd05096b76155e61b0666f",
  "name": "THY Payment Service",
  "description": "Turkish Airlines payment processing scenarios",
  "status": "active",
  "owner": "68fd05096b76155e61b0665e",
  "createdAt": "2024-12-28T17:11:16.231Z",
  "updatedAt": "2024-12-28T17:11:16.231Z"
}
```

## 🎯 Demo Credentials

```
Email: admin@example.com
Password: admin123
Role: Super Administrator
```

## 📞 Support

Herhangi bir sorun yaşarsanız:

1. Backend loglarını kontrol edin
2. MongoDB connection'ını kontrol edin
3. Environment variable'larını kontrol edin
4. Token'ın geçerli olduğundan emin olun

**Happy Testing! 🚀**
