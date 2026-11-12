import type { DocumentRecord } from '../types';
export const sqlSamples: Record<string, string> = {
  University: `PRAGMA foreign_keys = ON;
CREATE TABLE departments (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
CREATE TABLE instructors (id INTEGER PRIMARY KEY, name TEXT NOT NULL, department_id INTEGER REFERENCES departments(id));
CREATE TABLE students (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, department_id INTEGER REFERENCES departments(id), gpa REAL CHECK(gpa BETWEEN 0 AND 4), year INTEGER);
CREATE TABLE courses (id INTEGER PRIMARY KEY, code TEXT NOT NULL UNIQUE, title TEXT NOT NULL, credits INTEGER, instructor_id INTEGER REFERENCES instructors(id));
CREATE TABLE enrollments (id INTEGER PRIMARY KEY, student_id INTEGER NOT NULL REFERENCES students(id), course_id INTEGER NOT NULL REFERENCES courses(id), semester TEXT, UNIQUE(student_id,course_id,semester));
CREATE TABLE assignments (id INTEGER PRIMARY KEY, course_id INTEGER REFERENCES courses(id), title TEXT, max_score INTEGER);
CREATE TABLE grades (id INTEGER PRIMARY KEY, assignment_id INTEGER REFERENCES assignments(id), student_id INTEGER REFERENCES students(id), score INTEGER);
INSERT INTO departments VALUES (1,'Computer Science'),(2,'Mathematics'),(3,'Business');
INSERT INTO instructors VALUES (1,'Dr. Meera Shah',1),(2,'Prof. Oliver Reed',2),(3,'Dr. Alice Kim',1),(4,'Prof. Noah Patel',3);
INSERT INTO students VALUES (1,'Aarav Sharma','aarav@campus.edu',1,3.85,2),(2,'Emma Wilson','emma@campus.edu',1,3.65,3),(3,'Sofia Chen','sofia@campus.edu',2,3.92,1),(4,'Liam Brown','liam@campus.edu',3,3.10,2),(5,'Maya Thapa','maya@campus.edu',1,3.74,2),(6,'Noah Garcia','noah@campus.edu',2,3.45,3),(7,'Isabella Singh','isabella@campus.edu',3,3.88,1),(8,'Ethan Lee','ethan@campus.edu',1,2.96,1),(9,'Amira Khan','amira@campus.edu',2,3.57,2),(10,'Lucas Martin','lucas@campus.edu',1,3.20,3);
INSERT INTO courses VALUES (1,'CS101','Database Systems',3,1),(2,'CS202','Algorithms',4,3),(3,'MAT110','Statistics',3,2),(4,'BUS120','Business Analytics',3,4),(5,'CS303','Data Engineering',4,1);
INSERT INTO enrollments VALUES (1,1,1,'Fall 2026'),(2,1,2,'Fall 2026'),(3,2,1,'Fall 2026'),(4,3,3,'Fall 2026'),(5,4,4,'Fall 2026'),(6,5,1,'Fall 2026'),(7,5,5,'Fall 2026'),(8,6,3,'Fall 2026'),(9,7,4,'Fall 2026'),(10,8,2,'Fall 2026'),(11,9,3,'Fall 2026'),(12,10,5,'Fall 2026'),(13,2,5,'Fall 2026');
INSERT INTO assignments VALUES (1,1,'Relational Modeling',100),(2,1,'SQL Practice',100),(3,2,'Sorting Algorithms',100),(4,3,'Probability Quiz',50),(5,5,'ETL Pipeline',100);
INSERT INTO grades VALUES (1,1,1,93),(2,1,2,88),(3,1,5,95),(4,2,1,89),(5,3,1,86),(6,4,3,47),(7,5,5,91),(8,5,10,82);
CREATE INDEX idx_enroll_student ON enrollments(student_id); CREATE INDEX idx_enroll_course ON enrollments(course_id);`,
  'E-commerce': `PRAGMA foreign_keys=ON;
CREATE TABLE categories(id INTEGER PRIMARY KEY,name TEXT NOT NULL);
CREATE TABLE customers(id INTEGER PRIMARY KEY,name TEXT NOT NULL,city TEXT,email TEXT UNIQUE);
CREATE TABLE products(id INTEGER PRIMARY KEY,name TEXT,category_id INTEGER REFERENCES categories(id),price REAL,stock INTEGER);
CREATE TABLE orders(id INTEGER PRIMARY KEY,customer_id INTEGER REFERENCES customers(id),placed_at TEXT,status TEXT);
CREATE TABLE order_items(id INTEGER PRIMARY KEY,order_id INTEGER REFERENCES orders(id),product_id INTEGER REFERENCES products(id),quantity INTEGER,unit_price REAL);
CREATE TABLE payments(id INTEGER PRIMARY KEY,order_id INTEGER REFERENCES orders(id),amount REAL,method TEXT);
INSERT INTO categories VALUES(1,'Electronics'),(2,'Office'),(3,'Books');
INSERT INTO customers VALUES(1,'Amelia Scott','London','amelia@example.com'),(2,'Ravi Verma','Kathmandu','ravi@example.com'),(3,'Marcus Ford','Berlin','marcus@example.com'),(4,'Leila Hassan','Toronto','leila@example.com');
INSERT INTO products VALUES(1,'Wireless Keyboard',1,65,30),(2,'USB-C Hub',1,42,18),(3,'Notebook',2,6,120),(4,'Desk Lamp',2,34,26),(5,'Database Design Guide',3,39,40),(6,'Mechanical Mouse',1,49,22);
INSERT INTO orders VALUES(1,1,'2026-10-02','shipped'),(2,2,'2026-10-04','paid'),(3,1,'2026-10-07','pending'),(4,3,'2026-10-11','shipped'),(5,4,'2026-11-01','paid');
INSERT INTO order_items VALUES(1,1,1,1,65),(2,1,2,2,42),(3,2,5,1,39),(4,3,3,4,6),(5,4,4,2,34),(6,5,6,1,49),(7,5,2,1,42);
INSERT INTO payments VALUES(1,1,149,'card'),(2,2,39,'wallet'),(3,4,68,'card'),(4,5,91,'bank');`,
  Library: `PRAGMA foreign_keys=ON;
CREATE TABLE authors(id INTEGER PRIMARY KEY,name TEXT,country TEXT);
CREATE TABLE books(id INTEGER PRIMARY KEY,title TEXT,author_id INTEGER REFERENCES authors(id),year INTEGER,genre TEXT);
CREATE TABLE members(id INTEGER PRIMARY KEY,name TEXT,joined_at TEXT);
CREATE TABLE loans(id INTEGER PRIMARY KEY,book_id INTEGER REFERENCES books(id),member_id INTEGER REFERENCES members(id),loaned_on TEXT,returned_on TEXT);
CREATE TABLE reservations(id INTEGER PRIMARY KEY,book_id INTEGER REFERENCES books(id),member_id INTEGER REFERENCES members(id),requested_on TEXT);
INSERT INTO authors VALUES(1,'Octavia Butler','USA'),(2,'George Orwell','UK'),(3,'Mary Shelley','UK'),(4,'Chinua Achebe','Nigeria');
INSERT INTO books VALUES(1,'Kindred',1,1979,'Science Fiction'),(2,'Parable of the Sower',1,1993,'Science Fiction'),(3,'1984',2,1949,'Dystopian'),(4,'Animal Farm',2,1945,'Satire'),(5,'Frankenstein',3,1818,'Gothic'),(6,'Things Fall Apart',4,1958,'Historical Fiction');
INSERT INTO members VALUES(1,'Priya Nair','2026-01-08'),(2,'James Miller','2026-03-15'),(3,'Kiran Rai','2026-06-02');
INSERT INTO loans VALUES(1,1,1,'2026-10-01',NULL),(2,3,2,'2026-09-20','2026-10-04'),(3,5,3,'2026-10-10',NULL),(4,4,1,'2026-08-02','2026-08-16');
INSERT INTO reservations VALUES(1,1,2,'2026-10-12'),(2,6,3,'2026-11-01');`,
  Hospital: `PRAGMA foreign_keys=ON;
CREATE TABLE departments(id INTEGER PRIMARY KEY,name TEXT);
CREATE TABLE doctors(id INTEGER PRIMARY KEY,name TEXT,department_id INTEGER REFERENCES departments(id));
CREATE TABLE patients(id INTEGER PRIMARY KEY,name TEXT,age INTEGER);
CREATE TABLE appointments(id INTEGER PRIMARY KEY,doctor_id INTEGER REFERENCES doctors(id),patient_id INTEGER REFERENCES patients(id),day TEXT,status TEXT);
CREATE TABLE prescriptions(id INTEGER PRIMARY KEY,appointment_id INTEGER REFERENCES appointments(id),medicine TEXT,dosage_note TEXT);
INSERT INTO departments VALUES(1,'General Medicine'),(2,'Cardiology'),(3,'Dermatology');
INSERT INTO doctors VALUES(1,'Dr. Rina Das',1),(2,'Dr. Theo Baker',2),(3,'Dr. Sami Noor',3);
INSERT INTO patients VALUES(1,'Patient A',27),(2,'Patient B',49),(3,'Patient C',35),(4,'Patient D',61);
INSERT INTO appointments VALUES(1,1,1,'2026-10-02','complete'),(2,2,2,'2026-10-03','complete'),(3,3,3,'2026-10-06','scheduled'),(4,1,4,'2026-11-15','scheduled');
INSERT INTO prescriptions VALUES(1,1,'Example medicine A','Fictional data only'),(2,2,'Example medicine B','Fictional data only');`
};
export const documentSamples: Record<string, Record<string, DocumentRecord[]>> = {
  Campus: {
    students: [{_id:'s1',name:'Aarav Sharma',department:'Computer Science',gpa:3.85,year:2,skills:['SQL','Python'],address:{city:'Kathmandu',country:'Nepal'}},{_id:'s2',name:'Emma Wilson',department:'Computer Science',gpa:3.65,year:3,skills:['JavaScript','SQL'],address:{city:'London',country:'UK'}},{_id:'s3',name:'Sofia Chen',department:'Mathematics',gpa:3.92,year:1,skills:['R','Statistics'],address:{city:'Toronto',country:'Canada'}},{_id:'s4',name:'Liam Brown',department:'Business',gpa:3.1,year:2,skills:['Excel'],address:{city:'Bristol',country:'UK'}},{_id:'s5',name:'Maya Thapa',department:'Computer Science',gpa:3.74,year:2,skills:['Python','SQL'],address:{city:'Pokhara',country:'Nepal'}}],
    courses: [{_id:'c1',code:'CS101',title:'Database Systems',credits:3},{_id:'c2',code:'CS202',title:'Algorithms',credits:4},{_id:'c3',code:'MAT110',title:'Statistics',credits:3}],
    users: [{_id:'u1',name:'Aarav Sharma',role:'student',active:true},{_id:'u2',name:'Emma Wilson',role:'student',active:true},{_id:'u3',name:'Dr. Meera Shah',role:'instructor',active:true}],
    comments: [{_id:'cm1',author:'u1',text:'Very useful explanation',likes:12},{_id:'cm2',author:'u2',text:'Can we see more joins?',likes:5}]
  },
  Commerce: {
    products: [{_id:'p1',name:'Wireless Keyboard',category:'Electronics',price:65,stock:30,tags:['computer','accessory']},{_id:'p2',name:'USB-C Hub',category:'Electronics',price:42,stock:18,tags:['computer','usb']},{_id:'p3',name:'Notebook',category:'Office',price:6,stock:120,tags:['paper']},{_id:'p4',name:'Desk Lamp',category:'Office',price:34,stock:26,tags:['lighting']},{_id:'p5',name:'Database Design Guide',category:'Books',price:39,stock:40,tags:['learning','database']}],
    orders: [{_id:'o1',customer:'Amelia Scott',items:[{product:'p1',qty:1},{product:'p2',qty:2}],total:149,status:'shipped'},{_id:'o2',customer:'Ravi Verma',items:[{product:'p5',qty:1}],total:39,status:'paid'},{_id:'o3',customer:'Marcus Ford',items:[{product:'p4',qty:2}],total:68,status:'shipped'}],
    users: [{_id:'u10',name:'Amelia Scott',city:'London'},{_id:'u11',name:'Ravi Verma',city:'Kathmandu'}]
  }
};
export const sqlExamples = [
  { name:'Explore students', query:'SELECT id, name, gpa, year\nFROM students\nORDER BY gpa DESC\nLIMIT 10;' },
  { name:'Join enrollment data', query:'SELECT s.name, c.code, c.title, e.semester\nFROM enrollments e\nJOIN students s ON s.id = e.student_id\nJOIN courses c ON c.id = e.course_id\nORDER BY s.name;' },
  { name:'Group by department', query:'SELECT d.name AS department, COUNT(*) AS students, ROUND(AVG(s.gpa), 2) AS average_gpa\nFROM departments d\nLEFT JOIN students s ON s.department_id = d.id\nGROUP BY d.id\nORDER BY average_gpa DESC;' },
  { name:'Create a table', query:'CREATE TABLE notes (\n  id INTEGER PRIMARY KEY,\n  body TEXT NOT NULL,\n  created_at TEXT DEFAULT CURRENT_TIMESTAMP\n);\nINSERT INTO notes (body) VALUES (\'My first local table\');\nSELECT * FROM notes;' },
  { name:'Query plan', query:'EXPLAIN QUERY PLAN\nSELECT * FROM enrollments WHERE student_id = 1;' }
];
export const documentExamples = [
  { name:'Find students', query: JSON.stringify({collection:'students',operation:'find',filter:{gpa:{$gte:3.5}},sort:{gpa:-1},limit:10},null,2) },
  { name:'Aggregation pipeline', query: JSON.stringify({collection:'students',operation:'aggregate',pipeline:[{$group:{_id:'$department',count:{$sum:1},avgGpa:{$avg:'$gpa'}}},{$sort:{avgGpa:-1}}]},null,2) },
  { name:'Insert one', query: JSON.stringify({collection:'students',operation:'insertOne',document:{name:'New Student',department:'Computer Science',gpa:3.5,year:1,skills:['SQL']}},null,2) },
  { name:'Update many', query: JSON.stringify({collection:'students',operation:'updateMany',filter:{year:1},update:{$inc:{year:1}}},null,2) },
  { name:'Find embedded fields', query: JSON.stringify({collection:'students',operation:'find',filter:{'address.country':'Nepal'},projection:{name:1,'address.city':1}},null,2) }
];
