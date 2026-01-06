using Microsoft.AspNetCore.Mvc;
using E_TestHub.Models;

namespace E_TestHub.Controllers
{
    public class AdminController : BaseController
    {
        public IActionResult Dashboard()
        {
            var stats = AdminData.GetSystemStats();
            ViewBag.SystemStats = stats;
            return View();
        }

        public IActionResult CreateUser()
        {
            return View();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult CreateUser(CreateUserViewModel model)
        {
            if (!ModelState.IsValid)
            {
                return View(model);
            }

            // Validate password confirmation
            if (model.Password != model.ConfirmPassword)
            {
                ModelState.AddModelError("ConfirmPassword", "Mật khẩu xác nhận không khớp.");
                return View(model);
            }

            // Create new user object
            var newUser = new User
            {
                Email = model.Email,
                FullName = model.FullName,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(model.Password),
                Role = model.Role,
                IsActive = true,
                CreatedDate = DateTime.Now
            };

            // Set role-specific properties
            switch (model.Role)
            {
                case UserRole.Student:
                    newUser.StudentId = model.StudentId;
                    newUser.Class = model.Class;
                    break;
                case UserRole.Teacher:
                    newUser.EmployeeId = model.EmployeeId;
                    newUser.Department = model.Department;
                    break;
                case UserRole.Admin:
                    // Admins may also have an EmployeeId in addition to Position
                    newUser.EmployeeId = model.EmployeeId;
                    newUser.Position = model.Position;
                    break;
            }

            // Add user using AdminData
            if (AdminData.AddUser(newUser))
            {
                TempData["SuccessMessage"] = $"Người dùng {newUser.FullName} đã được tạo thành công!";
                return RedirectToAction("UserManagement");
            }
            else
            {
                ModelState.AddModelError("", "Không thể tạo người dùng. Vui lòng kiểm tra lại thông tin.");
                return View(model);
            }
        }

        public IActionResult SystemSettings()
        {
            return View();
        }

        public IActionResult Reports()
        {
            var stats = AdminData.GetSystemStats();
            ViewBag.SystemStats = stats;
            return View();
        }

        public IActionResult SchoolManagement()
        {
            return View();
        }

        public IActionResult AuditLogs()
        {
            return View();
        }

        [HttpPost]
        public IActionResult CheckEmailExists(string email)
        {
            if (string.IsNullOrEmpty(email))
            {
                return Json(new { exists = false });
            }

            var users = AdminData.GetUsers();
            var exists = users.Any(u => u.Email.Equals(email, StringComparison.OrdinalIgnoreCase));

            return Json(new { exists });
        }

        // Test method without authentication
        public IActionResult UserManagement()
        {
            var users = AdminData.GetUsers();
            ViewBag.Users = users;
            ViewBag.TotalUsers = users.Count;
            ViewBag.ActiveUsers = users.Count(u => u.IsActive);
            ViewBag.InactiveUsers = users.Count(u => !u.IsActive);
            ViewBag.StudentsCount = users.Count(u => u.Role == UserRole.Student);
            ViewBag.TeachersCount = users.Count(u => u.Role == UserRole.Teacher);
            ViewBag.AdminsCount = users.Count(u => u.Role == UserRole.Admin);

            return View();
        }

        public IActionResult Profile()
        {
            return View();
        }
    }
}