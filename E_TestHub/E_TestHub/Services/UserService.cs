using E_TestHub.Models;

namespace E_TestHub.Services
{
    public interface IUserService
    {
        Task<User?> AuthenticateAsync(string email, string password);
        Task<User?> GetUserByIdAsync(int userId);
        Task<User?> GetUserByEmailAsync(string email);
        Task<bool> CreateUserAsync(User user, string password);
        Task<bool> UpdateUserAsync(User user);
        Task<bool> DeleteUserAsync(int userId);
        Task<IEnumerable<User>> GetUsersByRoleAsync(UserRole role);
        Task<bool> ResetPasswordAsync(string email);
    }

    public class UserService : IUserService
    {
        // Demo implementation - In production, use database
        private static readonly List<User> _users = new()
        {
            new User 
            { 
                Id = 1, 
                Email = "student@demo.com", 
                FullName = "Nguyễn Văn Sinh Viên", 
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("student123"), 
                Role = UserRole.Student,
                StudentId = "SV001",
                Class = "PM233H"
            },
            new User 
            { 
                Id = 2, 
                Email = "teacher@demo.com", 
                FullName = "Võ Nguyễn Thanh Hiếu", 
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("teacher123"), 
                Role = UserRole.Teacher,
                EmployeeId = "T001",
                Department = "Khoa Công Nghệ Thông Tin"
            },
            new User 
            { 
                Id = 3, 
                Email = "admin@demo.com", 
                FullName = "Trần Thị Quản Trị", 
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"), 
                Role = UserRole.Admin,
                Position = "Quản trị hệ thống"
            }
        };

        public async Task<User?> AuthenticateAsync(string email, string password)
        {
            await Task.Delay(100); // Simulate async operation
            
            var user = _users.FirstOrDefault(u => u.Email.ToLower() == email.ToLower() && u.IsActive);
            
            if (user != null && BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
            {
                user.LastLoginDate = DateTime.Now;
                return user;
            }
            
            return null;
        }

        public async Task<User?> GetUserByIdAsync(int userId)
        {
            await Task.Delay(50);
            return _users.FirstOrDefault(u => u.Id == userId);
        }

        public async Task<User?> GetUserByEmailAsync(string email)
        {
            await Task.Delay(50);
            return _users.FirstOrDefault(u => u.Email.ToLower() == email.ToLower());
        }

        public async Task<bool> CreateUserAsync(User user, string password)
        {
            await Task.Delay(100);
            
            user.Id = _users.Max(u => u.Id) + 1;
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(password);
            user.CreatedDate = DateTime.Now;
            
            _users.Add(user);
            return true;
        }

        public async Task<bool> UpdateUserAsync(User user)
        {
            await Task.Delay(100);
            
            var existingUser = _users.FirstOrDefault(u => u.Id == user.Id);
            if (existingUser != null)
            {
                existingUser.FullName = user.FullName;
                existingUser.Email = user.Email;
                existingUser.Role = user.Role;
                existingUser.IsActive = user.IsActive;
                // Update role-specific properties as needed
                return true;
            }
            
            return false;
        }

        public async Task<bool> DeleteUserAsync(int userId)
        {
            await Task.Delay(100);
            
            var user = _users.FirstOrDefault(u => u.Id == userId);
            if (user != null)
            {
                user.IsActive = false; // Soft delete
                return true;
            }
            
            return false;
        }

        public async Task<IEnumerable<User>> GetUsersByRoleAsync(UserRole role)
        {
            await Task.Delay(100);
            return _users.Where(u => u.Role == role && u.IsActive).ToList();
        }

        public async Task<bool> ResetPasswordAsync(string email)
        {
            await Task.Delay(100);
            
            var user = _users.FirstOrDefault(u => u.Email.ToLower() == email.ToLower());
            if (user != null)
            {
                // In production, send email with reset link
                // For demo, reset to default password
                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword("123456");
                return true;
            }
            
            return false;
        }
    }
}