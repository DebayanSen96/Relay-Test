import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum FarmRequestStatus {
  PENDING_DEPLOYMENT = 'PENDING_DEPLOYMENT',
  STRATEGY_DEPLOYED = 'STRATEGY_DEPLOYED',
  FARM_DEPLOYED = 'FARM_DEPLOYED',
  POOL_DEPLOYED = 'POOL_DEPLOYED',
  READY = 'READY',
  AWAITING_VERIFICATION = 'AWAITING_VERIFICATION',
  FAILED = 'FAILED'
}

export enum StrategyType {
  RESTAKE = 'RESTAKE',
  UNIV3_LP = 'UNIV3_LP',
  AAVE_LEND = 'AAVE_LEND',
  CUSTOM = 'CUSTOM'
}

@Entity('farm_requests')
export class FarmRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  farmName!: string;

  @Column({ type: 'text' })
  farmDescription!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  farmLogoUrl: string | null = null;

  @Column({ type: 'varchar', length: 42 })
  principalAssetAddress!: string;

  @Column({ type: 'enum', enum: StrategyType })
  strategyType!: StrategyType;

  @Column({ type: 'varchar', length: 42, nullable: true })
  strategyContractAddress: string | null = null;

  @Column({ type: 'jsonb' })
  parameters!: Record<string, any>;

  @Column({ type: 'jsonb' })
  incentiveSplits!: {
    lp: number;
    verifier: number;
    yieldYoda: number;
  };

  @Column({ type: 'integer' })
  maturityPeriodDays!: number;

  @Column({ type: 'jsonb' })
  claimToken!: {
    name: string;
    symbol: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  creatorMetadata: Record<string, any> | null = null;

  @Column({ type: 'varchar', length: 42 })
  creatorAddress!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  metadataIpfsHash: string | null = null;

  @Column({ type: 'enum', enum: FarmRequestStatus, default: FarmRequestStatus.PENDING_DEPLOYMENT })
  status: FarmRequestStatus = FarmRequestStatus.PENDING_DEPLOYMENT;

  @Column({ type: 'varchar', length: 66, nullable: true })
  salt: string | null = null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  farmId: string | null = null;

  @Column({ type: 'varchar', length: 42, nullable: true })
  farmAddress: string | null = null;

  @Column({ type: 'varchar', length: 42, nullable: true })
  poolAddress: string | null = null;

  @Column({ type: 'jsonb', nullable: true })
  deploymentData: Record<string, any> | null = null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
