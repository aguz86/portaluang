import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardApp from './DashboardApp';
import Home from './pages/Home';
import Pricing from './pages/Pricing';
import ProLanding from './pages/ProLanding';
import Features from './pages/Features';
import About from './pages/About';
import FAQ from './pages/FAQ';
import Blog from './pages/Blog';
import Contact from './pages/Contact';
import Login from './pages/Login';
import Register from './pages/Register';
import Checkout from './pages/Checkout';
import ForgotPassword from './pages/ForgotPassword';
import VerifyEmail from './pages/VerifyEmail';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';

import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminTransactions } from './pages/admin/AdminTransactions';
import { AdminSubscriptions } from './pages/admin/AdminSubscriptions';
import { AdminPayments } from './pages/admin/AdminPayments';
import { AdminTelegram } from './pages/admin/AdminTelegram';
import { AdminSettings } from './pages/admin/AdminSettings';
import { AdminAiSettings } from './pages/admin/AdminAiSettings';
import { AdminMarketing } from './pages/admin/AdminMarketing';
import { AdminInstall } from './pages/admin/AdminInstall';
import { AdminContent } from './pages/admin/AdminContent';
import { AdminPosts } from './pages/admin/AdminPosts';
import { AdminFAQs } from './pages/admin/AdminFAQs';
import { MetaPixel } from './components/MetaPixel';


export default function App() {
  return (
    <BrowserRouter>
      <MetaPixel />
      <Routes>
        {/* Public Landing Pages */}
        <Route path="/" element={<Home />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/landing/pro" element={<ProLanding />} />
        <Route path="/features" element={<Features />} />
        <Route path="/about" element={<About />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/contact" element={<Contact />} />
        
        {/* Auth & Checkout Pages */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        
        {/* Legal Pages */}
        <Route path="/legal/privacy" element={<Privacy />} />
        <Route path="/legal/terms" element={<Terms />} />

        {/* Dashboard Application */}
        <Route path="/app/*" element={<ProtectedRoute />}>
          <Route path="*" element={<DashboardApp />} />
        </Route>
        
        
        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="ai-settings" element={<AdminAiSettings />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="transactions" element={<AdminTransactions />} />
          <Route path="subscriptions" element={<AdminSubscriptions />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="telegram" element={<AdminTelegram />} />
          <Route path="marketing" element={<AdminMarketing />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="install" element={<AdminInstall />} />
          <Route path="content" element={<AdminContent />} />
          <Route path="posts" element={<AdminPosts />} />
          <Route path="faqs" element={<AdminFAQs />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
