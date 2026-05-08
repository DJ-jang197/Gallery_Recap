package com.siel.kernel;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class SielSpringApplication {

	// Bootstraps the Spring application context and embedded web server.
	public static void main(String[] args) {
		SpringApplication.run(SielSpringApplication.class, args);
	}

}
