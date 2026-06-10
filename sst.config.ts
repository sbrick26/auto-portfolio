// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "auto-portfolio",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
      providers: { aws: { region: "us-east-2" } },
    };
  },
  async run() {
    new sst.aws.Nextjs("Site", {
      domain:
        $app.stage === "production"
          ? { name: "imsway.dev", redirects: ["www.imsway.dev"] }
          : undefined,
    });
  },
});
