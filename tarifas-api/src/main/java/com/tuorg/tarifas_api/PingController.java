package com.tuorg.tarifasapi;

import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class PingController {

  @GetMapping("/ping")
  public Map<String, Object> ping() {
    return Map.of("ok", true, "ts", Instant.now().toString());
  }
}
