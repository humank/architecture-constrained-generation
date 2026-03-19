import { EnvironmentConfig } from './types';

export const stagingConfig: EnvironmentConfig = {
  environment: 'staging',
  region: 'us-east-1',

  vpc: {
    maxAzs: 2,
    natGateways: 1,
  },

  rds: {
    instanceType: 't3.medium', // Do NOT use 'db.' prefix — CDK adds it automatically
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
