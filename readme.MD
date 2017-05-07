# Manage a Book Trading Club

---

## User Stories

- [ ] User Story: I can view all books posted by every user.
- [ ] User Story: I can add a new book.
- [ ] User Story: I can update my settings to store my full name, city, and state.
- [ ] User Story: I can propose a trade and wait for the other user to accept the trade.

## API

### Users

POST /api/login - Log in
GET /api/logout - Log out
POST /api/users - Create new user
PUT /api/users/[username] - Update profile
GET /api/users/[username] - Get User Profile

### Books

POST /api/books - Add Book
GET /api/books - Get list of books
GET /api/books/[book_id]
PUT /api/books/[book_id] - Update Book
DELETE /api/books/[book_id] - Delete Book

### Requests Subresource

GET /api/books/[book_id]/requests - List current requests for book
POST /api/books/[book_id]/requests - Add new request
GET /api/books/[book_id]/requests/[request_id] - Retrieve request
PUT /api/books/[book_id]/requests/[request_id] - Update request