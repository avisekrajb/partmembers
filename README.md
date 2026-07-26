# Voter Management Application

A full-stack application for managing voter records with Excel file uploads, data viewing, and secure admin access.

## Features

- **Public Data Viewing**: Anyone can view all voter records
- **Admin Dashboard**: Upload Excel files (folder upload supported)
- **Excel Parsing**: Automatically parse .xlsx files with proper data structure
- **Secure Authentication**: Admin login with JWT-based authentication
- **Bulk Operations**: Upload multiple files at once
- **Responsive Design**: Works on desktop and mobile devices
- **Production Ready**: Optimized for deployment

## Tech Stack

### Frontend
- React 18
- React Router v6
- Axios for API calls
- Lucide React for icons
- React Toastify for notifications
- XLSX for Excel parsing

### Backend
- Node.js with Express
- MongoDB Atlas (Mongoose ODM)
- JWT for authentication
- Multer for file uploads
- XLSX for Excel processing

## Prerequisites

- Node.js 16+
- npm or yarn
- MongoDB Atlas account (or local MongoDB)
- Git

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd voter-management-app