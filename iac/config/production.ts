import { EnvironmentConfig } from './types';

export const productionConfig: EnvironmentConfig = {
  environment: 'production',
  region: 'us-east-1',

  vpc: {
    maxAzs: 3,
    natGateways: 2,
  },

  rds: {
    instanceType: 't3.medium', // Do NOT use 'db.' prefix — CDK adds it automatically
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
