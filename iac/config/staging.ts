export const stagingConfig = {
  environment: 'staging',
  region: 'ap-east-2',

  vpc: {
    maxAzs: 2,
    natGateways: 1,
  },

  rds: {
    instanceType: 'db.t3.medium',
    multiAz: false,
    allocatedStorage: 20,
    backupRetention: 7,
  },

  eks: {
    nodeInstanceType: 't3.medium',
    minNodes: 2,
    maxNodes: 4,
    desiredNodes: 2,
  },

  services: {
    ordering: { replicas: 1, cpu: '250m', memory: '512Mi' },
    preparation: { replicas: 1, cpu: '250m', memory: '512Mi' },
    inventory: { replicas: 1, cpu: '200m', memory: '384Mi' },
    reporting: { replicas: 1, cpu: '150m', memory: '256Mi' },
  },

  cloudfront: {
    priceClass: 'PRICE_CLASS_100',
  },

  waf: {
    enabled: false,
  },
};
