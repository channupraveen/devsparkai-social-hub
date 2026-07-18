import { TestBed } from '@angular/core/testing';

import { AiContent } from './ai-content';

describe('AiContent', () => {
  let service: AiContent;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AiContent);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
