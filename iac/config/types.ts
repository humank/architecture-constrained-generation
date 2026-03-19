/** Shared typed configuration used across all CDK stacks. */
export interface EnvironmentConfig {
  environment: string;
  region: string;

  vpc: {
    maxAzs: number;
    natGateways: number;
  };

  rds: {
    /**
     * EC2 instance type for the RDS instance (e.g. 't3.medium').
     * Do NOT use the 'db.' prefix — CDK adds it automatically.
     */
    instanceType: string;
    multiAz: boolean;
    allocatedStorage: number;
    backupRetention: number;
  };

  eks: {
    nodeInstanceType: string;
    minNodes: number;
    maxNodes: number;
    desiredNodes: number;
  };

  services: Record<string, {
    replicas: number;
    cpu: string;
    memory: string;
  }>;

  cloudfront: {
    priceClass: string;
  };

  waf: {
    enabled: boolean;
  };
}
