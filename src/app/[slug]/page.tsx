"use client";

import { use } from "react";
import { PublicProfilePage } from "@/components/public/PublicProfilePage";

export default function CustomerJoinPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    return <PublicProfilePage slug={slug} />;
}
