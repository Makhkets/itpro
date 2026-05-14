INSERT INTO library_books (id, title, author, isbn, category, description, total_copies, available_copies, location)
VALUES
('70000000-0000-0000-0000-000000000005', 'Clean Code', 'Robert C. Martin', '9780132350884', 'software', 'Practical guide to writing maintainable software.', 3, 3, 'LIB-101, shelf SE-2'),
('70000000-0000-0000-0000-000000000006', 'The Go Programming Language', 'Alan A. A. Donovan, Brian W. Kernighan', '9780134190440', 'programming', 'A clear introduction to Go for backend development.', 2, 2, 'LIB-101, shelf GO-1')
ON CONFLICT (id) DO NOTHING;
