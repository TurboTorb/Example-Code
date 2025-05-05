import {injectable, BindingScope} from '@loopback/core';
import {repository} from '@loopback/repository';
import {PersonRepository, ProjectsRepository, InviteRepository} from '../repositories';
import {HttpErrors} from '@loopback/rest';
import {Person} from '../models';

@injectable({scope: BindingScope.TRANSIENT})
export class PersonService {
  constructor(
    @repository(PersonRepository)
    private personRepository: PersonRepository,
    @repository(ProjectsRepository)
    public projectsRepository: ProjectsRepository,
    @repository(InviteRepository)
    public InviteRepository: InviteRepository,
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

  async bulkCreate(persons: Person[]) {
    persons.forEach(person => {
      if (!person.organizerOwnerId)
        throw new HttpErrors[400]('ownerId is required');
    });

    return this.personRepository.createAll(persons);
  }

  async create(person: Person) {
    if (!person.organizerOwner)
      throw new HttpErrors[400]('ownerId is required');

    return this.personRepository.create(person);
  }


  private async createPerson(Person: Person, accountId: string) {
    const currentPerson = await kcAdminClient.users.create({
        username: Person.email,
        firstName: Person.firstName,
        lastName: Person.lastName,
        email: Person.email,
        attributes: {
          phone: Person.phone,
          termsOfService: new Date(),
          tenantId: 'master',
          accountAdminId: Person.accountAdminid,
        },
        credentials: [{value: Person.password, type: 'password'}],
        enabled: true,
      });

      //Consolidate Invitations
      const invites = await this.inviteRepository.find({
        where: {
          and: [
            {isDeleted: false},
            {acceptableBy: Person.email},
            {tenantId: 'master'},
          ],
        },
      });

      invites
        .filter(invite => invite.invitedTo.find(invTo => invTo.type !== 'Person'))
        .map(async invite => {
          const project = {
            email: Person.email,
            name: `${Person.firstName} ${Person.lastName}`,
            ownerId: currentPerson.id,
            accountId: invite.invitedTo[0].id,
          };
          const proj = await this.projectsRepository.create(project);
        });

      return currentPerson;
  }
}