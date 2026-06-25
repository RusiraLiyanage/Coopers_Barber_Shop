/// <reference types="jest" />

import { NotFoundException } from '@nestjs/common';
import { ReferenceDataItem, ReferenceDataType } from '@coopers/entities';
import { ReferenceDataService } from './reference-data.service';

describe('ReferenceDataService transactions', () => {
  const referenceDataRepository = {
    findOne: jest.fn(),
    remove: jest.fn(),
  };
  const transactionalReferenceDataRepository = {
    findOne: jest.fn(),
    remove: jest.fn(),
  };
  const transactionManager = {
    getRepository: jest.fn(),
    query: jest.fn(),
  };
  const dataSource = {
    transaction: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    transactionManager.getRepository.mockReturnValue(
      transactionalReferenceDataRepository,
    );
    dataSource.transaction.mockImplementation(
      (callback: (manager: typeof transactionManager) => unknown) =>
        Promise.resolve(callback(transactionManager)),
    );
  });

  it('removes barber capability references and the reference item in one transaction', async () => {
    const service = new ReferenceDataService(
      referenceDataRepository as never,
      dataSource as never,
    );
    const item = {
      id: 'reference-1',
      type: ReferenceDataType.BARBER_CAPABILITY,
      label: 'Colour Correction',
      value: 'colour correction',
    };

    transactionalReferenceDataRepository.findOne.mockResolvedValue(item);
    transactionalReferenceDataRepository.remove.mockResolvedValue(item);

    await service.delete('reference-1');

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(transactionManager.getRepository).toHaveBeenCalledWith(
      ReferenceDataItem,
    );
    expect(transactionalReferenceDataRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'reference-1' },
    });
    expect(transactionManager.query).toHaveBeenCalledTimes(2);

    const [staffUpdateSql, staffUpdateParams] = transactionManager.query.mock
      .calls[0] as [string, string[]];
    const [serviceUpdateSql] = transactionManager.query.mock.calls[1] as [
      string,
      string[],
    ];

    expect(staffUpdateSql).toContain('UPDATE staff');
    expect(staffUpdateParams).toEqual(['colour correction']);
    expect(serviceUpdateSql).toContain('UPDATE services');
    expect(serviceUpdateSql).toContain('required_skills');
    expect(transactionalReferenceDataRepository.remove).toHaveBeenCalledWith(
      item,
    );
    expect(referenceDataRepository.remove).not.toHaveBeenCalled();
  });

  it('rolls the transaction back when the reference item is missing', async () => {
    const service = new ReferenceDataService(
      referenceDataRepository as never,
      dataSource as never,
    );

    transactionalReferenceDataRepository.findOne.mockResolvedValue(null);

    await expect(service.delete('missing-reference')).rejects.toThrow(
      NotFoundException,
    );

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(transactionManager.query).not.toHaveBeenCalled();
    expect(transactionalReferenceDataRepository.remove).not.toHaveBeenCalled();
  });
});
