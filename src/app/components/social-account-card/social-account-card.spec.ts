import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SocialAccountCard } from './social-account-card';

describe('SocialAccountCard', () => {
  let component: SocialAccountCard;
  let fixture: ComponentFixture<SocialAccountCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SocialAccountCard],
    }).compileComponents();

    fixture = TestBed.createComponent(SocialAccountCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
