import { render, screen } from '@testing-library/react';
import AccessDenied from '@/pages/accessDenied';

describe("AccessDenied", () => {
    test("Checks Heading rendering", () => {
        render(<AccessDenied />);
        expect(screen.getByText(/Denied/)).toBeInTheDocument();
    });

    test("Checks Text rendering", () => {
        render(<AccessDenied />);
        expect(screen.getByText(/You need/)).toBeInTheDocument();
    });
});