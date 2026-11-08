import { describe, expect, it } from "vitest";
import { canRecordApproval, evaluateExport } from "./approval";

const hash = "abc123";

describe("approval gates (R10–R16, R19)", () => {
  it("rejects a client approval before the copy expert", () => {
    const result = canRecordApproval({
      actorId: "external-client",
      role: "external_client",
      userType: "freelance",
      contentHash: hash,
      assignments: [
        { role: "practitioner", actorId: "practitioner" },
        { role: "copy_expert", actorId: "copy-expert" },
        { role: "external_client", actorId: "external-client" },
      ],
      approvals: [],
    });
    expect(result.ok).toBe(false);
  });

  it("rejects an approver who is not assigned", () => {
    const result = canRecordApproval({
      actorId: "practitioner",
      role: "external_client",
      userType: "freelance",
      contentHash: hash,
      assignments: [{ role: "practitioner", actorId: "practitioner" }],
      approvals: [{ role: "copy_expert", decision: "approved", contentHash: hash, actorId: "copy-expert" }],
    });
    expect(result.ok).toBe(false);
  });

  it("blocks export when validation failed", () => {
    const result = evaluateExport({
      validationPassed: false,
      contentHash: hash,
      userType: "freelance",
      languageReviewRequired: false,
      approvals: [],
      offerConfirmed: true,
      destinationConfirmed: true,
    });
    expect(result.eligible).toBe(false);
  });

  it("allows export only when both approvals match the hash", () => {
    const blocked = evaluateExport({
      validationPassed: true,
      contentHash: hash,
      userType: "freelance",
      languageReviewRequired: false,
      approvals: [{ role: "copy_expert", decision: "approved", contentHash: hash, actorId: "copy-expert" }],
      offerConfirmed: true,
      destinationConfirmed: true,
    });
    expect(blocked.eligible).toBe(false);

    const open = evaluateExport({
      validationPassed: true,
      contentHash: hash,
      userType: "freelance",
      languageReviewRequired: false,
      approvals: [
        { role: "copy_expert", decision: "approved", contentHash: hash, actorId: "copy-expert" },
        { role: "external_client", decision: "approved", contentHash: hash, actorId: "external-client" },
      ],
      offerConfirmed: true,
      destinationConfirmed: true,
    });
    expect(open.eligible).toBe(true);
    expect(open.independentReview).toBe(true);
  });

  it("does not treat an overlapping reviewer as independent", () => {
    const result = evaluateExport({
      validationPassed: true,
      contentHash: hash,
      userType: "freelance",
      languageReviewRequired: false,
      rolesOverlap: true,
      approvals: [
        { role: "copy_expert", decision: "approved", contentHash: hash, actorId: "practitioner" },
        { role: "external_client", decision: "approved", contentHash: hash, actorId: "external-client" },
      ],
      offerConfirmed: true,
      destinationConfirmed: true,
    });
    expect(result.eligible).toBe(true);
    expect(result.independentReview).toBe(false);
  });

  it("requires language review when the expert cannot assess the locale", () => {
    const result = evaluateExport({
      validationPassed: true,
      contentHash: hash,
      userType: "in_house",
      languageReviewRequired: true,
      approvals: [
        { role: "copy_expert", decision: "approved", contentHash: hash, actorId: "copy-expert" },
        { role: "internal_owner", decision: "approved", contentHash: hash, actorId: "internal-owner" },
      ],
      offerConfirmed: true,
      destinationConfirmed: true,
    });
    expect(result.eligible).toBe(false);
  });

  it("rejects an in-house owner on a freelance pack", () => {
    const result = canRecordApproval({
      actorId: "internal-owner",
      role: "internal_owner",
      userType: "freelance",
      contentHash: hash,
      assignments: [{ role: "internal_owner", actorId: "internal-owner" }],
      approvals: [{ role: "copy_expert", decision: "approved", contentHash: hash, actorId: "copy-expert" }],
    });
    expect(result.ok).toBe(false);
  });
});
