import { TestBed } from '@angular/core/testing';

import { SocialAccount } from './social-account';

describe('SocialAccount', () => {
  let service: SocialAccount;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SocialAccount);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
