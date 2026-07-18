import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScheduledPosts } from './scheduled-posts';

describe('ScheduledPosts', () => {
  let component: ScheduledPosts;
  let fixture: ComponentFixture<ScheduledPosts>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScheduledPosts],
    }).compileComponents();

    fixture = TestBed.createComponent(ScheduledPosts);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
