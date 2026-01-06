using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace E_TestHub.Controllers
{
    public class BaseController : Controller
    {
        public override void OnActionExecuting(ActionExecutingContext context)
        {
            // Check if user is logged in
            if (HttpContext.Session.GetString("UserId") == null)
            {
                context.Result = RedirectToAction("Login", "Home");
                return;
            }

            // Pass user info to ViewBag for layout
            ViewBag.UserId = HttpContext.Session.GetString("UserId");
            ViewBag.UserName = HttpContext.Session.GetString("UserName");
            ViewBag.UserRole = HttpContext.Session.GetString("UserRole");

            base.OnActionExecuting(context);
        }

        protected bool IsUserInRole(string role)
        {
            return HttpContext.Session.GetString("UserRole") == role;
        }

        protected string GetCurrentUserId()
        {
            return HttpContext.Session.GetString("UserId") ?? "";
        }

        protected string GetCurrentUserName()
        {
            return HttpContext.Session.GetString("UserName") ?? "";
        }

        protected string GetCurrentUserRole()
        {
            return HttpContext.Session.GetString("UserRole") ?? "";
        }
    }
}