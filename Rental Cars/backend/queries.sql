CREATE TABLE users (
	id SERIAL PRIMARY KEY,
	name VARCHAR(100) NOT NULL,
	email VARCHAR(100) UNIQUE NOT NULL,
	password VARCHAR(255) NOT NULL,
	role VARCHAR(55) DEFAULT 'customer',
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cars (
	id SERIAL PRIMARY KEY,
	make VARCHAR(50) NOT NULL,
	model VARCHAR(50) NOT NULL,
	year INT NOT NULL,
	price_per_day DECIMAL(10, 2) NOT NULl,
	transmission VARCHAR(50) NOT NULL,
	seats INT NOT NULL,
	available BOOLEAN DEFAULT TRUE,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE rentals (
	id SERIAL PRIMARY KEY,
	user_id INT REFERENCES users(id) ON DELETE CASCADE,
	car_id INT REFERENCES cars(id) ON DELETE CASCADE,
	pickup_date DATE NOT NULL,
	return_date DATE NOT NULL,
	status VARCHAR(50) DEFAULT 'pending',
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE locations (
	id SERIAL PRIMARY KEY,
	city VARCHAR(100) NOT NULL,
	address VARCHAR(255) NOT NULL,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE car_locations (
	car_id INT REFERENCES cars(id) ON DELETE CASCADE,
	location_id INT REFERENCES locations(id) ON DELETE CASCADE,
	PRIMARY KEY (car_id, location_id)
);

CREATE TABLE payments (
	id SERIAL PRIMARY KEY,
	rental_id INT REFERENCES rentals(id) ON DELETE CASCADE,
	amount DECIMAL(10,2) NOT NULL,
	payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	status VARCHAR(55) DEFAULT 'paid5'
);

INSERT INTO users (name, email, password, role)
VALUES ('Test', 'test@test.com', 'test1234', 'customer');