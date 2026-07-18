import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnalyticsCard } from './analytics-card';

describe('AnalyticsCard', () => {
  let component: AnalyticsCard;
  let fixture: ComponentFixture<AnalyticsCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnalyticsCard],
    }).compileComponents();

    fixture = TestBed.createComponent(AnalyticsCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
