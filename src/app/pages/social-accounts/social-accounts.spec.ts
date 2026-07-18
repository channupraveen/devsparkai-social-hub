import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SocialAccounts } from './social-accounts';

describe('SocialAccounts', () => {
  let component: SocialAccounts;
  let fixture: ComponentFixture<SocialAccounts>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SocialAccounts],
    }).compileComponents();

    fixture = TestBed.createComponent(SocialAccounts);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
