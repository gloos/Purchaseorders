# PO Tool - Purchase Order Management System

## 🎯 Project Overview

A modern, full-stack purchase order management system built for small to medium businesses. Streamlines the creation, management, and tracking of purchase orders with seamless FreeAgent integration.

## 📊 Project Status

- **Stage**: Active Development
- **Version**: 1.0.0
- **Last Updated**: October 2025
- **Repository**: [Purchaseorders](https://github.com/gloos/Purchaseorders)

## 🚀 Core Purpose

Enable businesses to:
- Create and manage purchase orders efficiently
- Sync contacts and company data from FreeAgent
- Generate professional PDF purchase orders
- Send POs via email automatically
- Track order status and analytics
- Maintain company branding across all documents

## 🛠 Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Custom components with modern design

### Backend
- **Runtime**: Node.js
- **API**: Next.js API Routes
- **Authentication**: Supabase Auth
- **Database ORM**: Prisma

### Database & Storage
- **Database**: PostgreSQL (Supabase)
- **File Storage**: Supabase Storage
- **Caching**: In-memory (future: Redis)

### Integrations
- **Accounting**: FreeAgent API (OAuth 2.0)
- **Email**: Resend API
- **PDF Generation**: @react-pdf/renderer
- **Email Templates**: @react-email/render

### DevOps
- **Version Control**: Git + GitHub
- **Deployment**: Vercel (recommended)
- **CI/CD**: GitHub Actions (future)

## 👥 Team

- **Product Owner**: Gary
- **Development**: Claude Code assisted development
- **Design**: Internal

## 🔗 Quick Links

- [Features Database →](02-FEATURES-DATABASE.csv)
- [Issues & Bugs →](03-ISSUES-DATABASE.csv)
- [Technical Documentation →](04-TECHNICAL-DOCS.md)
- [API Documentation →](05-API-DOCS.md)
- [Roadmap →](06-ROADMAP.csv)
- [Setup Guide →](07-SETUP-GUIDE.md)

## 📈 Key Metrics

- **Models**: 5 (User, Organization, Contact, PurchaseOrder, POLineItem)
- **API Endpoints**: 15+
- **Database Tables**: 5
- **External Integrations**: 2 (FreeAgent, Resend)
- **Lines of Code**: ~5,000+

## 🎨 Design Principles

1. **User-Centric**: Intuitive interface for non-technical users
2. **Data Integrity**: Atomic transactions, proper validation
3. **Security First**: OAuth 2.0, environment variables, input validation
4. **Scalable**: Multi-tenant architecture with organization isolation
5. **Maintainable**: TypeScript, clear code structure, comprehensive error handling
