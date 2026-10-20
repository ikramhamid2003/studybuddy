from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("study_api", "0005_document_documentchunk"),
    ]

    operations = [
        migrations.AddField(
            model_name="document",
            name="raw_text",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddIndex(
            model_name="document",
            index=models.Index(
                fields=["user", "created_at"],
                name="study_api_doc_user_created",
            ),
        ),
        migrations.AddIndex(
            model_name="generation",
            index=models.Index(
                fields=["user", "created_at"],
                name="study_api_gen_user_created",
            ),
        ),
        migrations.AddIndex(
            model_name="generation",
            index=models.Index(
                fields=["user", "type", "created_at"],
                name="study_api_gen_usr_type_created",
            ),
        ),
        migrations.AddIndex(
            model_name="usagelog",
            index=models.Index(
                fields=["user", "created_at"],
                name="study_api_usage_user_created",
            ),
        ),
    ]
