import { CONNECTION_GUIDES } from "../connectionGuides";
import type { BankProvider } from "../../types";

const PROVIDERS: BankProvider[] = ["simplefin", "teller"];

describe("CONNECTION_GUIDES", () => {
  it("has a guide for every supported provider and nothing extra", () => {
    expect(Object.keys(CONNECTION_GUIDES).sort()).toEqual([...PROVIDERS].sort());
  });

  it.each(PROVIDERS)("%s guide is complete and internally consistent", (provider) => {
    const guide = CONNECTION_GUIDES[provider];
    expect(guide.provider).toBe(provider);
    expect(guide.name.length).toBeGreaterThan(0);
    expect(guide.tagline.length).toBeGreaterThan(0);
    expect(guide.cost.length).toBeGreaterThan(0);
    // A first-timer needs real, ordered steps and at least one tip.
    expect(guide.steps.length).toBeGreaterThanOrEqual(3);
    guide.steps.forEach((step) => {
      expect(step.title.trim().length).toBeGreaterThan(0);
      expect(step.detail.trim().length).toBeGreaterThan(0);
    });
    expect(guide.tips.length).toBeGreaterThan(0);
    // Privacy section must answer the headline question and cite the policy.
    expect(guide.privacy.headline.length).toBeGreaterThan(0);
    expect(guide.privacy.points.length).toBeGreaterThan(0);
  });

  it.each(PROVIDERS)("%s guide links are all https", (provider) => {
    const guide = CONNECTION_GUIDES[provider];
    const urls = [
      guide.siteUrl,
      guide.officialGuideUrl,
      guide.privacy.policyUrl,
    ];
    urls.forEach((url) => expect(url).toMatch(/^https:\/\//));
  });

  it("points each privacy link at the provider's own domain", () => {
    expect(CONNECTION_GUIDES.simplefin.privacy.policyUrl).toContain("simplefin.org");
    expect(CONNECTION_GUIDES.teller.privacy.policyUrl).toContain("teller.io");
  });
});
