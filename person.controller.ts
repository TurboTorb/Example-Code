/* eslint-disable @typescript-eslint/no-explicit-any */
import {authorize} from '../authorization';
import {authenticate} from '@loopback/authentication';
import {inject, service} from '@loopback/core';
import {Filter, repository} from '@loopback/repository';
import {
  HttpErrors,
  operation,
  param,
  Request,
  RestBindings,
  tags,
} from '@loopback/rest';
import {SecurityBindings, PersonProfile} from '@loopback/security';
import debugFactory from 'debug';
import KcAdminClient from 'keycloak-admin';
import {
  InviteRepository,
  ProjectsRepository,
  PersonRepository,
} from '../repositories';
import {
  KeycloakService,
} from '../services';
import _ from 'lodash';

const debug = debugFactory('api-core:Persons:controller');

@tags('Persons')
export class PersonsController {
  constructor(
    @repository(PersonRepository)
    public PersonRepository: PersonRepository,
    @repository(ProjectsRepository)
    public projectsRepository: ProjectsRepository,
    @repository(InviteRepository)
    public InviteRepository: InviteRepository,
    @inject(RestBindings.Http.REQUEST) public request: Request,
    @service(KeycloakService) public keycloakService: KeycloakService,
  ) {}

  async clientAuth() {
    const kcAdminClient = new KcAdminClient({
      baseUrl: process.env.KC_BASE_URL,
      realmName: 'master',
    });

    await kcAdminClient.auth({
      Username: process.env.KC_REALM_USER,
      password: process.env.KC_REALM_PASS,
      grantType: 'password',
      clientId: 'admin-cli',
    });

    return kcAdminClient;
  }

  /**
   * This endpoint lists all the Persons
   *
   * @param profile
   * @param limit A limit on the number of objects to be returned.  Limit can range between 1 and 100, the default is 10.
   * @returns A paged array of Persons
   */
  @authenticate('jwt')
  @authorize({allowedRoles: ['admin']})
  @operation('get', '/Persons')
  async readPersons(
    @param({name: 'limit', in: 'query'}) limit: number,
    @inject(SecurityBindings.Person) profile: PersonProfile,
    @param.query.object('filter') filter?: Filter<any>,
  ): Promise<any> {
    return this.PersonRepository.find({
      where: {
        ...(filter?.where ?? {}),
        tenantId: profile.topTenantId,
      },
      ...(filter?.skip ? {skip: filter?.skip} : {}),
      ...(filter?.limit ? {limit: filter?.limit} : {}),
    });
  }

   /**
   * This endpoint creates a new Person
   *
   * @param profile
   * @param limit A limit on the number of objects to be returned.  Limit can range between 1 and 100, the default is 10.
   * @returns A paged array of Persons
   */
  @operation('post', '/Persons', {
    operationId: 'createPerson',
    summary: 'Create a Person',
    deprecated: true,
    description:
      "This will create a Person that can sign in to the system, and return the Person's id",
    security: [{oAuth2: ['clientCredentials', 'authorizationCode']}],
    responses: {
      '200': {
        description: 'Expected response to a valid request',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
      '422': {
        description:
          'Unprocessable Entity. Phone number is required to create an account',
      },
    },
  })
  async createPerson(
    @requestBody() Person: any,
  ): Promise<any> {
    const kcAdminClient = await this.clientAuth();
    try {
      const clients = await kcAdminClient.clients.find({
        realm: 'master',
      });
      const accountClient = clients.find(
        element => element.clientId === 'account',
      );
      
      const accountClientId = accountClient?.id;
      debug('accountClientId', accountClientId);

      return this.personsService.createPerson(Person, accountClient);
    } catch (err: any) {
      debug('err : Persons', err);
      throw new HttpErrors[err.response.status](err.response.data.errorMessage);
    }
  }

  /**
   *
   *

   * @param PersonId The id of the Person to retrieve
   * @returns Expected response to a valid request
   */
  @authenticate('jwt')
  @authorize({allowedRoles: ['admin', 'organizer']})
  @operation('get', '/Persons/{PersonId}')
  async readPersonById(
    @param({name: 'PersonId', in: 'path'}) PersonId: string,
  ): Promise<any> {
    return this.PersonRepository.findById(PersonId);
  }

  /**
   *
   *

   * @returns Expected response to a valid request
   * @param email
   */
  @operation('get', '/Persons-by-email/{email}')
  async readPersonByEmail(
    @param({name: 'email', in: 'path'}) email: string,
  ): Promise<any> {
    const kcAdminClient = await this.clientAuth();

    const Persons = await kcAdminClient.Persons.find({email, realm: 'master'});

    debug('Person', Persons);

    if (Persons.length === 0) {
      throw new HttpErrors.NotFound(
        'No Person exists with specified email address',
      );
    } else {
      return Persons[0];
    }
  }
}
