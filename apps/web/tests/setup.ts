import * as matchers from "@testing-library/jest-dom/matchers"
import { cleanup } from "@testing-library/react"
import { afterEach, expect } from "vitest"

process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000"

expect.extend(matchers)

afterEach(cleanup)
