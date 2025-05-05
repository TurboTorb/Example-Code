import {
    Entity,
    model,
    property,
    belongsTo,
    hasMany,
  } from '@loopback/repository';
  import {Account} from './account.model';
  import {Projects} from './projects.model';
  import {Billing} from './pricing/billing.model';
  
  @model({
    name: 'CloseV2',
    description: 'Close attributes',
    settings: {
      hiddenProperties: ['isDeleted', 'deletedAt'],
    },
  })
  export class Person extends Entity {
    @property({
      type: 'string',
      id: true,
      generated: true,
      mongodb: {dataType: 'ObjectId'},
    })
    id: string;
  
    @property({
      type: 'string',
      required: true,
    })
    ownerId: string;
  
    @property({
      type: 'string',
      required: true,
    })
    status: 'ACTIVE' | 'SIGNED' | 'COMPLETED';
  
    @belongsTo(() => Account)
    accountId: string;
  
    @belongsTo(() => Billing)
    billingId?: string;
  
    @hasMany(() => Projects)
    Projects: Projects[];
  
    @property({
      type: 'boolean',
      jsonSchema: {
        title: 'Person is Active',
        default: false,
      },
    })
    isActive: boolean;
  
    @property({
      type: 'object',
      required: false,
      jsonSchema: {
        title: 'Person Details',
        description: 'Person details',
        properties: {
          email: {
            type: 'string',
            description: "Person's email",
          },
          name: {
            type: 'string',
            description: "Person's name",
          },
          phone: {
            type: 'number',
            description: "Person's phone number",
          },
        },
      },
    })
    details?: {
      email?: string;
      name?: string;
      phone?: number;
    };
  
    @property({
      type: 'date',
      default: () => new Date(),
    })
    createdAt?: Date;
  
    @property({
      type: 'date',
      default: () => new Date(),
    })
    updatedAt?: Date;
  
    constructor(data?: Partial<Person>) {
      super(data);
    }
  }
  
  export interface PersonRelations {
    // describe navigational properties here
  }
  
  export type PersonWithRelations = Person & PersonRelations;
  