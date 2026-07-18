import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlatformSelector } from './platform-selector';

describe('PlatformSelector', () => {
  let component: PlatformSelector;
  let fixture: ComponentFixture<PlatformSelector>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlatformSelector],
    }).compileComponents();

    fixture = TestBed.createComponent(PlatformSelector);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
