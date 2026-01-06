using System;
using System.Collections.Generic;
using System.Linq;

namespace E_TestHub.Models
{
    public static class AdminData
    {
        // Static list to store users for testing purposes
        private static List<User> _users = new List<User>();

        static AdminData()
        {
            InitializeDefaultUsers();
        }

        private static void InitializeDefaultUsers()
        {
            _users = new List<User>
            {
                new User
                {
                    Id = 1,
                    Email = "admin@e-testhub.edu.vn",
                    FullName = "Administrator",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
                    Role = UserRole.Admin,
                    IsActive = true,
                    CreatedDate = new DateTime(2025, 1, 1),
                    LastLoginDate = new DateTime(2025, 10, 19, 9, 0, 0),
                    Position = "System Administrator"
                },
                new User
                {
                    Id = 2,
                    Email = "nguyenvana@e-testhub.edu.vn",
                    FullName = "TS. Nguyễn Văn A",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("teacher123"),
                    Role = UserRole.Teacher,
                    IsActive = true,
                    CreatedDate = new DateTime(2025, 1, 15),
                    LastLoginDate = new DateTime(2025, 10, 18, 14, 30, 0),
                    EmployeeId = "T001",
                    Department = "Computer Science"
                },
                new User
                {
                    Id = 3,
                    Email = "tranthib@e-testhub.edu.vn",
                    FullName = "PGS.TS. Trần Thị B",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("teacher123"),
                    Role = UserRole.Teacher,
                    IsActive = true,
                    CreatedDate = new DateTime(2025, 2, 1),
                    LastLoginDate = new DateTime(2025, 10, 17, 10, 15, 0),
                    EmployeeId = "T002",
                    Department = "Mathematics"
                },
                new User
                {
                    Id = 4,
                    Email = "levanc@e-testhub.edu.vn",
                    FullName = "TS. Lê Văn C",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("teacher123"),
                    Role = UserRole.Teacher,
                    IsActive = true,
                    CreatedDate = new DateTime(2025, 2, 15),
                    LastLoginDate = new DateTime(2025, 10, 16, 16, 45, 0),
                    EmployeeId = "T003",
                    Department = "Software Engineering"
                },
                new User
                {
                    Id = 5,
                    Email = "2151012001@student.hcmus.edu.vn",
                    FullName = "Nguyễn Văn A",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("student123"),
                    Role = UserRole.Student,
                    IsActive = true,
                    CreatedDate = new DateTime(2025, 9, 1),
                    LastLoginDate = new DateTime(2025, 10, 19, 8, 30, 0),
                    StudentId = "2151012001",
                    Class = "PM233H"
                },
                new User
                {
                    Id = 6,
                    Email = "2151012002@student.hcmus.edu.vn",
                    FullName = "Trần Thị B",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("student123"),
                    Role = UserRole.Student,
                    IsActive = true,
                    CreatedDate = new DateTime(2025, 9, 1),
                    LastLoginDate = new DateTime(2025, 10, 18, 12, 0, 0),
                    StudentId = "2151012002",
                    Class = "SE214H"
                },
                new User
                {
                    Id = 7,
                    Email = "2151012003@student.hcmus.edu.vn",
                    FullName = "Lê Văn C",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("student123"),
                    Role = UserRole.Student,
                    IsActive = false,
                    CreatedDate = new DateTime(2025, 9, 1),
                    LastLoginDate = new DateTime(2025, 9, 15, 14, 20, 0),
                    StudentId = "2151012003",
                    Class = "TM231H"
                },
                new User
                {
                    Id = 8,
                    Email = "2151012004@student.hcmus.edu.vn",
                    FullName = "Phạm Thị D",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("student123"),
                    Role = UserRole.Student,
                    IsActive = true,
                    CreatedDate = new DateTime(2025, 9, 1),
                    LastLoginDate = new DateTime(2025, 10, 17, 9, 45, 0),
                    StudentId = "2151012004",
                    Class = "IT001"
                },
                new User
                {
                    Id = 9,
                    Email = "phamthie@e-testhub.edu.vn",
                    FullName = "ThS. Phạm Thị E",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("teacher123"),
                    Role = UserRole.Teacher,
                    IsActive = true,
                    CreatedDate = new DateTime(2025, 3, 1),
                    LastLoginDate = new DateTime(2025, 10, 15, 11, 30, 0),
                    EmployeeId = "T004",
                    Department = "Information Technology"
                },
                new User
                {
                    Id = 10,
                    Email = "manager@e-testhub.edu.vn",
                    FullName = "System Manager",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
                    Role = UserRole.Admin,
                    IsActive = true,
                    CreatedDate = new DateTime(2025, 1, 10),
                    LastLoginDate = new DateTime(2025, 10, 18, 17, 0, 0),
                    Position = "System Manager"
                }
            };
        }

        // User Management Data - Cấu trúc tương thích với MongoDB schema
        public static List<User> GetUsers()
        {
            return _users.ToList();
        }

        public static User? GetUserById(int id)
        {
            return GetUsers().FirstOrDefault(u => u.Id == id);
        }

        public static List<User> GetUsersByRole(UserRole role)
        {
            return GetUsers().Where(u => u.Role == role).ToList();
        }

        public static List<User> GetActiveUsers()
        {
            return GetUsers().Where(u => u.IsActive).ToList();
        }

        public static List<User> GetInactiveUsers()
        {
            return GetUsers().Where(u => !u.IsActive).ToList();
        }

        public static List<User> SearchUsers(string searchTerm)
        {
            if (string.IsNullOrWhiteSpace(searchTerm))
                return GetUsers();

            return GetUsers().Where(u =>
                u.FullName.Contains(searchTerm, StringComparison.OrdinalIgnoreCase) ||
                u.Email.Contains(searchTerm, StringComparison.OrdinalIgnoreCase) ||
                (u.StudentId != null && u.StudentId.Contains(searchTerm)) ||
                (u.EmployeeId != null && u.EmployeeId.Contains(searchTerm)) ||
                u.Id.ToString().Contains(searchTerm)
            ).ToList();
        }

        // Add new user method
        public static bool AddUser(User newUser)
        {
            // Validation
            if (string.IsNullOrWhiteSpace(newUser.Email) ||
                string.IsNullOrWhiteSpace(newUser.FullName))
                return false;

            // Check for email duplicates
            if (_users.Any(u => u.Email.ToLower() == newUser.Email.ToLower()))
                return false;

            // Check for role-specific duplicates
            if (newUser.Role == UserRole.Student && !string.IsNullOrWhiteSpace(newUser.StudentId))
            {
                if (_users.Any(u => u.StudentId == newUser.StudentId))
                    return false;
            }

            if ((newUser.Role == UserRole.Teacher || newUser.Role == UserRole.Admin) && !string.IsNullOrWhiteSpace(newUser.EmployeeId))
            {
                if (_users.Any(u => u.EmployeeId == newUser.EmployeeId))
                    return false;
            }

            // Generate new ID
            newUser.Id = _users.Max(u => u.Id) + 1;
            newUser.CreatedDate = DateTime.Now;
            newUser.IsActive = true;

            // Add to the list
            _users.Add(newUser);

            return true;
        }

        // Clear all users (for testing purposes)
        public static void ClearAllUsers()
        {
            _users.Clear();
            InitializeDefaultUsers();
        }

        // System Statistics
        public static SystemStats GetSystemStats()
        {
            var users = GetUsers();
            return new SystemStats
            {
                TotalUsers = users.Count,
                ActiveUsers = users.Count(u => u.IsActive),
                InactiveUsers = users.Count(u => !u.IsActive),
                StudentsCount = users.Count(u => u.Role == UserRole.Student),
                TeachersCount = users.Count(u => u.Role == UserRole.Teacher),
                AdminsCount = users.Count(u => u.Role == UserRole.Admin),
                TotalExams = 45, // Placeholder value - will be replaced with actual exam count
                CompletedExams = 32, // Placeholder value - will be replaced with actual completed exam count
                LastUpdated = DateTime.Now
            };
        }
    }

    public class SystemStats
    {
        public int TotalUsers { get; set; }
        public int ActiveUsers { get; set; }
        public int InactiveUsers { get; set; }
        public int StudentsCount { get; set; }
        public int TeachersCount { get; set; }
        public int AdminsCount { get; set; }
        public int TotalExams { get; set; }
        public int CompletedExams { get; set; }
        public DateTime LastUpdated { get; set; }
    }
}
