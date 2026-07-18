import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContentCalendar } from './content-calendar';

describe('ContentCalendar', () => {
  let component: ContentCalendar;
  let fixture: ComponentFixture<ContentCalendar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContentCalendar],
    }).compileComponents();

    fixture = TestBed.createComponent(ContentCalendar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
