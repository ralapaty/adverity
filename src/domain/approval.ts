export type ApprovalRole = "copy_expert" | "external_client" | "internal_owner" | "language_reviewer";

export type ApprovalRecord = {
  role: ApprovalRole;
  decision: "approved";
  contentHash: string;
  actorId: string;
};

export type Assignment = { role: string; actorId: string };

const ROUTE_ROLE: Record<"freelance" | "in_house", ApprovalRole> = {
  freelance: "external_client",
  in_house: "internal_owner",
};

export function routeRole(userType: "freelance" | "in_house"): ApprovalRole {
  return ROUTE_ROLE[userType];
}

export function canRecordApproval(input: {
  actorId: string;
  role: ApprovalRole;
  userType: "freelance" | "in_house";
  contentHash: string;
  assignments: Assignment[];
  approvals: ApprovalRecord[];
}): { ok: true } | { ok: false; reason: string } {
  const assigned = input.assignments.some((row) => row.role === input.role && row.actorId === input.actorId);
  if (!assigned) return { ok: false, reason: "not_assigned" };
  if (input.role === "external_client" && input.userType !== "freelance") {
    return { ok: false, reason: "wrong_route" };
  }
  if (input.role === "internal_owner" && input.userType !== "in_house") {
    return { ok: false, reason: "wrong_route" };
  }
  const expertApproved = input.approvals.some(
    (row) => row.role === "copy_expert" && row.decision === "approved" && row.contentHash === input.contentHash,
  );
  if (input.role !== "copy_expert" && input.role !== "language_reviewer" && !expertApproved) {
    return { ok: false, reason: "expert_required" };
  }
  return { ok: true };
}

export function evaluateExport(input: {
  validationPassed: boolean;
  contentHash: string;
  userType: "freelance" | "in_house";
  languageReviewRequired: boolean;
  rolesOverlap?: boolean;
  approvals: ApprovalRecord[];
  offerConfirmed: boolean;
  destinationConfirmed: boolean;
}): { eligible: boolean; independentReview: boolean; reason: string } {
  const independentReview = !input.rolesOverlap;
  if (!input.validationPassed) return { eligible: false, independentReview, reason: "validation_failed" };
  if (!input.offerConfirmed) return { eligible: false, independentReview, reason: "offer_unconfirmed" };
  if (!input.destinationConfirmed) return { eligible: false, independentReview, reason: "destination_unconfirmed" };
  const matches = (role: ApprovalRole) =>
    input.approvals.some((row) => row.role === role && row.decision === "approved" && row.contentHash === input.contentHash);
  if (!matches("copy_expert")) return { eligible: false, independentReview, reason: "expert_pending" };
  if (!matches(routeRole(input.userType))) return { eligible: false, independentReview, reason: "approver_pending" };
  if (input.languageReviewRequired && !matches("language_reviewer")) {
    return { eligible: false, independentReview, reason: "language_review_pending" };
  }
  return { eligible: true, independentReview, reason: "ready" };
}
