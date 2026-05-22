import "reflect-metadata";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { CreateRunOrchestratorDto } from "./create-run-orchestrator.dto";
import { JavaOrchestratorDto } from "./java-orchestrator.dto";
import { ClearJobDto } from "./clear-job-orchestrator.dto";

describe("CreateRunOrchestratorDto", () => {
  const valid = {
    REPO_URL: "https://github.com/user/repo",
    JAVA_VERSION: "17.0.1",
  };

  it("accepts valid github URL and semver version", async () => {
    const dto = plainToInstance(CreateRunOrchestratorDto, valid);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("accepts gitlab URL", async () => {
    const dto = plainToInstance(CreateRunOrchestratorDto, {
      ...valid,
      REPO_URL: "https://gitlab.com/user/repo",
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("accepts single-segment version", async () => {
    const dto = plainToInstance(CreateRunOrchestratorDto, {
      ...valid,
      JAVA_VERSION: "17",
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("rejects http URL", async () => {
    const dto = plainToInstance(CreateRunOrchestratorDto, {
      ...valid,
      REPO_URL: "http://github.com/user/repo",
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "REPO_URL")).toBe(true);
  });

  it("rejects non-whitelisted domain", async () => {
    const dto = plainToInstance(CreateRunOrchestratorDto, {
      ...valid,
      REPO_URL: "https://bitbucket.org/user/repo",
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "REPO_URL")).toBe(true);
  });

  it("rejects empty REPO_URL", async () => {
    const dto = plainToInstance(CreateRunOrchestratorDto, {
      ...valid,
      REPO_URL: "",
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "REPO_URL")).toBe(true);
  });

  it("rejects alphabetic JAVA_VERSION", async () => {
    const dto = plainToInstance(CreateRunOrchestratorDto, {
      ...valid,
      JAVA_VERSION: "seventeen",
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "JAVA_VERSION")).toBe(true);
  });

  it("rejects version with too many segments", async () => {
    const dto = plainToInstance(CreateRunOrchestratorDto, {
      ...valid,
      JAVA_VERSION: "17.0.1.2.3",
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "JAVA_VERSION")).toBe(true);
  });

  it("rejects empty JAVA_VERSION", async () => {
    const dto = plainToInstance(CreateRunOrchestratorDto, {
      ...valid,
      JAVA_VERSION: "",
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "JAVA_VERSION")).toBe(true);
  });
});

describe("JavaOrchestratorDto", () => {
  it("accepts valid gitlab https URL", async () => {
    const dto = plainToInstance(JavaOrchestratorDto, {
      REPO_URL: "https://gitlab.com/user/repo",
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("rejects http URL", async () => {
    const dto = plainToInstance(JavaOrchestratorDto, {
      REPO_URL: "http://github.com/user/repo",
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "REPO_URL")).toBe(true);
  });

  it("rejects non-whitelisted domain", async () => {
    const dto = plainToInstance(JavaOrchestratorDto, {
      REPO_URL: "https://bitbucket.org/user/repo",
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "REPO_URL")).toBe(true);
  });

  it("rejects empty REPO_URL", async () => {
    const dto = plainToInstance(JavaOrchestratorDto, { REPO_URL: "" });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "REPO_URL")).toBe(true);
  });
});

describe("ClearJobDto", () => {
  it("accepts valid kubernetes job name", async () => {
    const dto = plainToInstance(ClearJobDto, {
      jobName: "maven-generator-123",
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("rejects uppercase characters", async () => {
    const dto = plainToInstance(ClearJobDto, { jobName: "MavenJob" });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "jobName")).toBe(true);
  });

  it("rejects name starting with dash", async () => {
    const dto = plainToInstance(ClearJobDto, { jobName: "-job" });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "jobName")).toBe(true);
  });

  it("rejects empty jobName", async () => {
    const dto = plainToInstance(ClearJobDto, { jobName: "" });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "jobName")).toBe(true);
  });

  it("rejects name ending with dash", async () => {
    const dto = plainToInstance(ClearJobDto, { jobName: "job-" });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "jobName")).toBe(true);
  });
});
