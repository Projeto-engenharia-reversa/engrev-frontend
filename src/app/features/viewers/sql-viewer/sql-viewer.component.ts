import { Component, input } from '@angular/core';

@Component({
  selector: 'app-sql-viewer',
  standalone: true,
  templateUrl: './sql-viewer.component.html',
  styleUrl: './sql-viewer.component.css',
})
export class SqlViewerComponent {
  sql = input.required<string>();

  copy(): void {
    void navigator.clipboard.writeText(this.sql());
  }
}
