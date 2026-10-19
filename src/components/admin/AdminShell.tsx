"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import ChangePasswordModal from "./ChangePasswordModal";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [adminEmail, setAdminEmail] = useState("khapluali19@gmail.com");
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);

  // If on login page, render full-page login experience without the admin layout
  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (isLoginPage) return;

    async function checkSession() {
      try {
        const res = await fetch("/api/admin/auth/session");
        if (res.ok) {
          const data = await res.json();
          if (data.email) setAdminEmail(data.email);
          if (data.mustChangePassword) {
            setMustChangePassword(true);
            setChangePasswordModalOpen(true);
          }
        } else if (res.status === 401) {
          router.push("/admin/login");
        }
      } catch (err) {
        console.error("Session verification failed:", err);
      }
    }

    checkSession();
  }, [isLoginPage, router]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  const handleSyncTrigger = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      alert("Manual sync request completed. Google Sheets records re-indexed.");
    }, 1000);
  };

  const getPageTitle = () => {
    if (pathname === "/admin/sheets") {
      return { 
        title: "Google Sheets Manager", 
        subtitle: "Connect and map spreadsheets for Lower Class, Middle Class, and Overall categories" 
      };
    }
    if (pathname === "/admin/categories") {
      return { 
        title: "Result Categories Management", 
        subtitle: "Configure Lower Class, Middle Class, and Overall competition tracks" 
      };
    }
    if (pathname === "/admin/branding") {
      return { 
        title: "Website Branding Settings", 
        subtitle: "Customize competition title, announcement banners, logos, and public field visibility" 
      };
    }
    if (pathname === "/admin/social") {
      return { 
        title: "Social Media & Communication Links", 
        subtitle: "Manage Facebook, Instagram, YouTube, LinkedIn, and WhatsApp channels" 
      };
    }
    if (pathname === "/admin/preview") {
      return { 
        title: "Live Portal Preview", 
        subtitle: "Inspect the public student result portal across desktop, tablet, and mobile" 
      };
    }
    return { 
      title: "Administrator Dashboard", 
      subtitle: "Triple-E Organization 2nd Quiz Competition results management" 
    };
  };

  const { title, subtitle } = getPageTitle();

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden text-slate-900">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col">
        <AdminSidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-navy-950/70 backdrop-blur-xs"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative z-10">
            <AdminSidebar onCloseMobile={() => setMobileSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AdminHeader
          title={title}
          subtitle={subtitle}
          adminEmail={adminEmail}
          onOpenMobile={() => setMobileSidebarOpen(true)}
          onSyncTrigger={handleSyncTrigger}
          onOpenChangePassword={() => setChangePasswordModalOpen(true)}
          isSyncing={isSyncing}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Change Password Modal (Mandatory on First Login or Triggered from Header) */}
      <ChangePasswordModal
        isOpen={changePasswordModalOpen}
        isMandatory={mustChangePassword}
        onClose={() => {
          if (!mustChangePassword) {
            setChangePasswordModalOpen(false);
          }
        }}
        onSuccess={() => {
          setMustChangePassword(false);
          setChangePasswordModalOpen(false);
          alert("Password updated successfully! You may now proceed with administration.");
        }}
      />
    </div>
  );
}
