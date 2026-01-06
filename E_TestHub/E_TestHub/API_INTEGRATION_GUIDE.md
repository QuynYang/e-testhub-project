# Hướng dẫn tích hợp API Node.js với trang Login

## Tổng quan

Trang login đã được tích hợp với Node.js API để xác thực người dùng. API sẽ kiểm tra:

- Email và password có đúng không
- Role (vai trò) có khớp với role trong database không
- Tài khoản có đang active không

## Cài đặt và Chạy API

### Bước 1: Cài đặt dependencies

```bash
cd api
npm install
```

### Bước 2: Cấu hình MongoDB

Đảm bảo MongoDB đang chạy trên `localhost:27017`. Nếu chưa có, cài đặt MongoDB và khởi động service.

### Bước 3: Tạo file .env

Tạo file `.env` trong thư mục `api/` với nội dung:

```
PORT=3000
MONGO_URI=mongodb://localhost:27017/e-testhub
JWT_SECRET=Yangdangiu
```

### Bước 4: Chạy API Server

```bash
cd api
npm start
# hoặc để development mode với auto-reload
npm run dev
```

API sẽ chạy trên `http://localhost:3000`

## Sử dụng trang Login

### 1. Chọn vai trò (Role)

Trên trang login, người dùng cần chọn vai trò:

- **Sinh viên** (student)
- **Giáo viên** (teacher)
- **Quản trị viên** (admin)

### 2. Nhập thông tin đăng nhập

- **Email**: Email đã đăng ký trong hệ thống
- **Mật khẩu**: Mật khẩu của tài khoản

### 3. Đăng nhập

Sau khi nhập đầy đủ thông tin, click nút "Đăng nhập". Hệ thống sẽ:

1. Gửi request đến API `/api/auth/login` với email, password và role
2. API kiểm tra:
   - Email có tồn tại không
   - Password có đúng không
   - Role có khớp với role trong database không
   - Tài khoản có đang active không
3. Nếu tất cả đều đúng:
   - API trả về JWT token và thông tin user
   - Token được lưu vào localStorage
   - User được chuyển hướng đến dashboard tương ứng với role

### 4. Xử lý lỗi

- **Thiếu thông tin**: Hiển thị thông báo yêu cầu nhập đầy đủ
- **Email/Password sai**: Hiển thị "Email hoặc mật khẩu không đúng"
- **Role không khớp**: Hiển thị "Vai trò không khớp. Tài khoản này có vai trò: [role]"
- **Tài khoản bị khóa**: Hiển thị "Tài khoản đã bị khóa"
- **Lỗi kết nối**: Hiển thị "Không thể kết nối đến server"

## Tạo tài khoản test

### Cách 1: Sử dụng API register

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@test.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "Student",
    "role": "student"
  }'
```

### Cách 2: Sử dụng MongoDB shell

```javascript
use e-testhub
db.users.insertOne({
  email: "student@test.com",
  password: "$2a$10$...", // bcrypt hash của "password123"
  firstName: "Test",
  lastName: "Student",
  role: "student",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

**Lưu ý**: Password phải được hash bằng bcrypt với cost factor 10.

## Cấu hình API URL

Nếu API chạy trên port khác hoặc domain khác, cập nhật trong file `wwwroot/js/login.js`:

```javascript
const API_BASE_URL = "http://localhost:3000/api";
```

Thay đổi thành URL của API server thực tế.

## Lưu trữ thông tin đăng nhập

Sau khi đăng nhập thành công, thông tin được lưu trong localStorage:

- `token`: JWT token để xác thực các request tiếp theo
- `user`: Thông tin user (JSON string)
- `userRole`: Role của user

Để sử dụng token trong các request khác:

```javascript
const token = localStorage.getItem("token");
fetch("http://localhost:3000/api/users", {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

## Troubleshooting

### Lỗi: "Không thể kết nối đến server"

- Kiểm tra API server có đang chạy không
- Kiểm tra CORS configuration trong API
- Kiểm tra firewall/network settings

### Lỗi: "Role không khớp"

- Đảm bảo role được chọn trên form khớp với role trong database
- Kiểm tra role trong database: `db.users.findOne({email: "user@example.com"})`

### Lỗi: "MongoDB connection failed"

- Kiểm tra MongoDB có đang chạy không
- Kiểm tra MONGO_URI trong file .env
- Kiểm tra MongoDB có chấp nhận kết nối từ localhost không

## API Endpoints

### POST /api/auth/login

Đăng nhập với email, password và role.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "password123",
  "role": "student"
}
```

**Response Success:**

```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "firstName": "First",
    "lastName": "Last",
    "fullName": "First Last",
    "role": "student"
  }
}
```

**Response Error:**

```json
{
  "message": "Error message here"
}
```

## Bảo mật

- Password được hash bằng bcrypt trước khi lưu vào database
- JWT token có thời hạn 7 ngày
- Token được lưu trong localStorage (có thể chuyển sang httpOnly cookie để bảo mật hơn)
- Tất cả endpoint (trừ auth) yêu cầu authentication token
