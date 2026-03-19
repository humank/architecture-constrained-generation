export const productionConfig = {
  environment: 'production',
  region: 'ap-east-2',

  vpc: {
    maxAzs: 3,
    natGateways: 2,
  },

  rds: {
    instanceType: 'db.t3.medium',
    multiAz: true,
    allocatedStorage: 50,
    backupRetention: 14,
  },

  eks: {
    nodeInstanceType: 't3.medium',
    minNodes: 2,
    maxNodes: 6,
    desiredNodes: 3,
  },

  services: {
    ordering: { replicas: 2, cpu: '500m', memory: '1Gi' },
    preparation: { replicas: 2, cpu: '500m', memory: '1Gi' },
    inventory: { replicas: 2, cpu: '400m', memory: '768Mi' },
    reporting: { replicas: 1, cpu: '300m', memory: '512Mi' },
  },

  cloudfront: {
    priceClass: 'PRICE_CLASS_200',
  },

  waf: {
    enabled: true,
  },
};
