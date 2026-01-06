# E_TestHub - Hệ thống Quản lý Thi cử Trực tuyến

[![.NET](https://img.shields.io/badge/.NET-8.0-blue.svg)](https://dotnet.microsoft.com/)
[![ASP.NET Core](https://img.shields.io/badge/ASP.NET%20Core-MVC-green.svg)](https://docs.microsoft.com/en-us/aspnet/core/)

## 📋 Tổng quan

**E_TestHub** là hệ thống quản lý thi cử trực tuyến hiện đại được xây dựng bằng ASP.NET Core MVC. Hệ thống cung cấp giải pháp toàn diện cho việc tổ chức, quản lý và thực hiện các kỳ thi trực tuyến với giao diện thân thiện và dễ sử dụng.

### 🎯 Mục tiêu
- Đơn giản hóa quy trình tổ chức thi cử
- Cung cấp trải nghiệm người dùng mượt mà cho tất cả vai trò
- Đảm bảo tính bảo mật và toàn vẹn dữ liệu
- Hỗ trợ quản lý quy mô lớn

## ✨ Tính năng nổi bật

### 👨‍🎓 **Sinh viên (Student)**
- 📚 Xem danh sách lớp học và môn học
- 📝 Tham gia làm bài thi trực tuyến
- 📊 Xem điểm và kết quả thi chi tiết
- 🔔 Nhận thông báo từ giảng viên
- 👤 Quản lý hồ sơ cá nhân
- 📅 Theo dõi lịch thi sắp tới

### 👨‍🏫 **Giảng viên (Teacher)**
- 📋 Quản lý lớp học và danh sách sinh viên
- 📝 Tạo và chỉnh sửa đề thi
- 🗂️ Quản lý ngân hàng câu hỏi
- ✅ Chấm điểm và xem kết quả thi
- 📢 Gửi thông báo cho sinh viên
- 📈 Xuất báo cáo thống kê
- 📄 Xem chi tiết đề thi với danh sách câu hỏi

### 👨‍💼 **Quản trị viên (Admin)**
- 👥 Quản lý tài khoản người dùng (thêm/sửa/xóa)
- 📊 Dashboard thống kê tổng quan hệ thống
- 🏫 Quản lý thông tin trường học
- 📋 Xem nhật ký hoạt động (Audit Logs)
- ⚙️ Cấu hình hệ thống
- 📊 Xuất báo cáo tổng hợp

## 🛠️ Công nghệ sử dụng

### Backend
- **Framework**: ASP.NET Core 8.0 MVC
- **Ngôn ngữ**: C# 12
- **Authentication**: Session-based Authentication
- **Mã hóa mật khẩu**: BCrypt.Net
- **Session Management**: ASP.NET Core Session
- **Database**: Static data (sẵn sàng tích hợp MongoDB)

### Frontend
- **Template Engine**: Razor Pages
- **CSS Framework**: Bootstrap 5 + Custom CSS
- **JavaScript**: jQuery + Custom Scripts
- **Icons**: Font Awesome 6
- **Design**: Responsive với CSS Grid & Flexbox

### Development Tools
- **IDE**: Visual Studio 2022 / VS Code
- **Version Control**: Git
- **Package Manager**: NuGet

## 📋 Yêu cầu hệ thống

- **Runtime**: .NET 8.0 SDK
- **OS**: Windows 10+, macOS 10.15+, Linux (Ubuntu 18.04+)
- **Memory**: Tối thiểu 4GB RAM
- **Storage**: 500MB dung lượng trống
- **Browser**: Chrome 90+, Firefox 88+, Edge 90+, Safari 14+

## 🚀 Cài đặt và Chạy

### 1. Clone repository
```bash
git clone https://github.com/TienxDun/E_TestHub.git
cd E_TestHub
```

### 2. Khôi phục dependencies
```bash
dotnet restore
```

### 3. Build dự án
```bash
dotnet build
```

### 4. Chạy ứng dụng
```bash
# Chế độ development với hot reload
dotnet watch run

# Hoặc chạy bình thường
dotnet run
```

### 5. Truy cập
Mở trình duyệt và truy cập: `http://localhost:5230`

## 📁 Cấu trúc dự án

```
E_TestHub/
├── Controllers/              # MVC Controllers
│   ├── AdminController.cs    # Chức năng Admin
│   ├── TeacherController.cs  # Chức năng Teacher
│   ├── StudentController.cs  # Chức năng Student
│   ├── HomeController.cs     # Đăng nhập & Trang chủ
│   └── BaseController.cs     # Base class với authentication
├── Models/                   # Data Models
│   ├── UserModels.cs         # User entities & enums
│   ├── AdminData.cs          # Demo data
│   └── ErrorViewModel.cs     # Error handling
├── Views/                    # Razor Views
│   ├── Admin/                # 8 views cho Admin
│   ├── Teacher/              # 12 views cho Teacher
│   ├── Student/              # 10 views cho Student
│   ├── Home/                 # Trang đăng nhập
│   └── Shared/               # Layouts & partials
├── wwwroot/                 # Static files
│   ├── css/
│   │   ├── shared/           # CSS chung
│   │   ├── admin/            # CSS Admin
│   │   ├── teacher/          # CSS Teacher
│   │   └── student/          # CSS Student
│   ├── js/                   # JavaScript files
│   ├── images/               # Hình ảnh
│   └── lib/                  # Third-party libraries
├── Services/                # Business Logic
│   └── UserService.cs        # Xác thực người dùng
└── Properties/
    └── launchSettings.json   # Cấu hình chạy
```

## 🧪 Testing

### Manual Testing ✅
- **Coverage**: 30/30 views đã được test thành công
- **Authentication**: Session-based auth hoạt động đúng
- **Authorization**: Role-based access control
- **Navigation**: Tất cả routes hoạt động
- **UI/UX**: Responsive design trên mobile & desktop
- **Forms**: Validation đầy đủ

### Automated Testing
```bash
# Chạy unit tests (sẽ được thêm trong tương lai)
dotnet test
```

## 📊 Trạng thái phát triển

### ✅ **Phase 1 - Core Features (85% Complete)**
- [x] Authentication system
- [x] Admin dashboard & user management
- [x] Student module (10/10 views)
- [x] Teacher module (12/12 views)
- [x] Responsive UI design
- [x] Form validation
- [x] Session management

### 🔄 **Phase 2 - Database Integration (Next)**
- [ ] MongoDB integration
- [ ] Data migration
- [ ] CRUD operations
- [ ] File upload
- [ ] Email notifications

### 📋 **Phase 3 - Advanced Features (Future)**
- [ ] Real-time features
- [ ] Advanced analytics
- [ ] Mobile app
- [ ] Third-party API integration

## 🤝 Đóng góp

Chúng tôi hoan nghênh mọi đóng góp! Vui lòng:

1. **Fork** repository
2. **Tạo branch** mới: `git checkout -b feature/AmazingFeature`
3. **Commit** changes: `git commit -m 'Add AmazingFeature'`
4. **Push** to branch: `git push origin feature/AmazingFeature`
5. **Tạo Pull Request**

### Quy tắc đóng góp
- Tuân thủ C# coding conventions
- Sử dụng tên biến có ý nghĩa
- Comment code bằng tiếng Việt
- Validate input data
- Handle errors gracefully

## 📝 License

Dự án này được phân phối dưới giấy phép MIT. Xem file [LICENSE](LICENSE) để biết thêm chi tiết.

## 👥 Tác giả

**TienxDun**
- GitHub: [@TienxDun](https://github.com/TienxDun)

## 📞 Liên hệ

Nếu bạn có câu hỏi hoặc góp ý, vui lòng:
- Tạo issue trên [GitHub](https://github.com/TienxDun/E_TestHub/issues)
- Liên hệ qua email

## 🙏 Acknowledgments

- **ASP.NET Core Team** - Framework mạnh mẽ
- **Bootstrap Team** - CSS Framework
- **Font Awesome** - Icon library
- **BCrypt.Net** - Password hashing
- **Microsoft** - .NET ecosystem
- Tất cả contributors mã nguồn mở

---

**Trạng thái**: 🟢 Đang phát triển tích cực  
**Cập nhật cuối**: October 19, 2025  
**Phiên bản**: 1.0.0-beta  
**Test Coverage**: 30/30 views ✅</content>
<parameter name="filePath">c:\Users\ADMIN\Desktop\ASP.NET Core\E_TestHub\README.md
