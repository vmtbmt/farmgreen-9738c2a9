<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
# FarmGreen AI Guide

## Product

FarmGreen là nền tảng quản lý nông trại dành cho nông dân Việt Nam.

Mục tiêu:

- Quản lý khu vườn
- Theo dõi thời tiết
- Nhật ký chăm sóc
- AI hỗ trợ ra quyết định
- Quản lý chi phí
- Theo dõi sản lượng

AI chỉ hỗ trợ người dùng.

AI KHÔNG được tự động thực hiện hành động.

---

## Target Users

Người nông dân

Người mới làm nông

Chủ trang trại

---

## Core Principles

Đơn giản

Dễ hiểu

Mobile First

Không nhiều biểu đồ

Ít thao tác

Font lớn

---

## AI Feature

AI chỉ chạy khi người dùng bấm:

"Phân tích bằng AI"

Không gọi AI khi:

- mở Dashboard

- đổi tab

- load page

- refresh

---

## Tech Stack

React

TypeScript

Vite

TailwindCSS

shadcn/ui

Supabase

React Query

---

## Code Rules

Không dùng any.

Không duplicate component.

Không sửa file không liên quan.

Ưu tiên refactor hơn tạo mới.

Không thêm package nếu chưa cần.

Không thay đổi API nếu chưa được yêu cầu.

---

## UI

Màu chủ đạo:

Green

White

Gray

Thiết kế:

Đơn giản

Thân thiện

Nút lớn

Card lớn

Khoảng trắng nhiều

Icon dễ hiểu

---

## Dashboard Priority

1 Weather

2 Today's Tasks

3 Garden Health

4 Expense Summary

5 AI Suggestion Button

6 Recent Activities

Không hiển thị quá nhiều biểu đồ.

---

## Before Creating New Code

Kiểm tra component đã tồn tại chưa.

Nếu có

→ tái sử dụng.

Nếu chưa

→ tạo component mới.
