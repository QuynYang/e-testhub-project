using System.Diagnostics;
using E_TestHub.Services;
using E_TestHub.Models;
using Microsoft.AspNetCore.Mvc;

namespace E_TestHub.Controllers
{
    public class HomeController : Controller
    {
        private readonly ILogger<HomeController> _logger;
        private readonly IUserService _userService;

        public HomeController(ILogger<HomeController> logger, IUserService userService)
        {
            _logger = logger;
            _userService = userService;
        }

        public IActionResult Index()
        {
            return View();
        }

        // GET: /Home/Login
        [HttpGet]
        public IActionResult Login()
        {
            return View();
        }
        
        // POST: /Home/Login
        [HttpPost]
        public async Task<IActionResult> Login(string email, string password)
        {
            if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(password))
            {
                ViewBag.Error = "Vui lòng nhập đầy đủ thông tin.";
                return View();
            }

            var user = await _userService.AuthenticateAsync(email, password);
            if (user != null)
            {
                // Đăng nhập thành công, lưu thông tin user vào session
                HttpContext.Session.SetString("UserEmail", user.Email);
                HttpContext.Session.SetString("UserRole", user.Role.ToString());
                HttpContext.Session.SetString("UserName", user.FullName);
                HttpContext.Session.SetString("UserId", user.Id.ToString());

                // Chuyển hướng đến Dashboard phù hợp với role
                return user.Role switch
                {
                    UserRole.Admin => RedirectToAction("Dashboard", "Admin"),
                    UserRole.Teacher => RedirectToAction("Dashboard", "Teacher"),
                    UserRole.Student => RedirectToAction("Dashboard", "Student"),
                    _ => RedirectToAction("Index", "Home")
                };
            }
            else
            {
                ViewBag.Error = "Email hoặc mật khẩu không đúng.";
                return View();
            }
        }

        // GET: /Home/Register
        [HttpGet]
        public IActionResult Register()
        {
            return View();
        }

        // POST: /Home/Register
        [HttpPost]
        public IActionResult Register(string fullName, string email, string password, string confirmPassword)
        {
            // Kiểm tra dữ liệu đầu vào
            if (string.IsNullOrEmpty(fullName))
            {
                ViewBag.Error = "Vui lòng nhập họ tên.";
                return View();
            }

            if (string.IsNullOrEmpty(email))
            {
                ViewBag.Error = "Vui lòng nhập email.";
                return View();
            }

            if (string.IsNullOrEmpty(password))
            {
                ViewBag.Error = "Vui lòng nhập mật khẩu.";
                return View();
            }

            if (password != confirmPassword)
            {
                ViewBag.Error = "Mật khẩu xác nhận không khớp.";
                return View();
            }

            // Demo: Giả lập đăng ký thành công
            ViewBag.Success = "Đăng ký thành công! Bạn có thể đăng nhập ngay bây giờ.";
            return View();
        }

        // POST: /Home/SetSession - Set session after login via Node.js API
        [HttpPost]
        public IActionResult SetSession([FromBody] SetSessionRequest request)
        {
            try
            {
                _logger.LogInformation($"SetSession: Received request - Request is null: {request == null}");
                
                if (request == null)
                {
                    _logger.LogWarning("SetSession: Request is null");
                    return BadRequest(new { message = "Request body is required" });
                }
                
                _logger.LogInformation($"SetSession: UserId={request.userId}, Email={request.email}, Role={request.role}");
                
                if (string.IsNullOrEmpty(request.userId))
                {
                    _logger.LogWarning("SetSession: UserId is null or empty");
                    return BadRequest(new { message = "UserId is required" });
                }

                // Map role from API (lowercase) to C# enum format (capitalized)
                string userRole = request.role?.ToLower() switch
                {
                    "student" => "Student",
                    "teacher" => "Teacher",
                    "admin" => "Admin",
                    _ => "Student"
                };

                // Set session data
                HttpContext.Session.SetString("UserId", request.userId);
                HttpContext.Session.SetString("UserEmail", request.email ?? "");
                HttpContext.Session.SetString("UserName", request.fullName ?? $"{request.firstName} {request.lastName}".Trim());
                HttpContext.Session.SetString("UserRole", userRole);

                // Verify session was set
                var userId = HttpContext.Session.GetString("UserId");
                var userRoleCheck = HttpContext.Session.GetString("UserRole");
                
                _logger.LogInformation($"SetSession: Session set for UserId={userId}, Role={userRoleCheck}");

                // Determine redirect URL based on role
                string redirectUrl = userRoleCheck switch
                {
                    "Admin" => "/Admin/Dashboard",
                    "Teacher" => "/Teacher/Dashboard",
                    "Student" => "/Student/Dashboard",
                    _ => "/"
                };

                // Return redirect URL so client can redirect
                // Session will be committed automatically when response is sent
                return Ok(new { 
                    message = "Session set successfully",
                    userId = userId,
                    role = userRoleCheck,
                    redirectUrl = redirectUrl
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SetSession: Error setting session");
                return StatusCode(500, new { message = "Error setting session", error = ex.Message });
            }
        }

        // GET: /Home/RedirectToDashboard - Redirect to dashboard after session is set
        // This endpoint is called after SetSession to ensure session cookie is sent
        [HttpGet]
        public IActionResult RedirectToDashboard()
        {
            // Check if session exists
            var userId = HttpContext.Session.GetString("UserId");
            var userRole = HttpContext.Session.GetString("UserRole");
            
            if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(userRole))
            {
                _logger.LogWarning("RedirectToDashboard: No session found, redirecting to login");
                return RedirectToAction("Login", "Home");
            }

            _logger.LogInformation($"RedirectToDashboard: Redirecting UserId={userId}, Role={userRole}");

            // Redirect based on role
            return userRole switch
            {
                "Admin" => RedirectToAction("Dashboard", "Admin"),
                "Teacher" => RedirectToAction("Dashboard", "Teacher"),
                "Student" => RedirectToAction("Dashboard", "Student"),
                _ => RedirectToAction("Login", "Home")
            };
        }

        // GET: /Home/Logout
        public IActionResult Logout()
        {
            // Xóa tất cả session data
            HttpContext.Session.Clear();
            
            // Clear localStorage
            // Note: This will be handled by JavaScript on the client side
            
            // Chuyển hướng về trang chủ
            return RedirectToAction("Login", "Home");
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }

    // Model for SetSession request
    public class SetSessionRequest
    {
        public string userId { get; set; } = "";
        public string email { get; set; } = "";
        public string firstName { get; set; } = "";
        public string lastName { get; set; } = "";
        public string fullName { get; set; } = "";
        public string role { get; set; } = "";
    }
}
