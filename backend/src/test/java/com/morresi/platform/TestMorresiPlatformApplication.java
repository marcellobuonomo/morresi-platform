package com.morresi.platform;

import org.springframework.boot.SpringApplication;

public class TestMorresiPlatformApplication {

	public static void main(String[] args) {
		SpringApplication.from(MorresiPlatformApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
